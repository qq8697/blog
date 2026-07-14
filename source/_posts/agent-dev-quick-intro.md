---
title: Agent 开发快速入门
date: 2026-06-26 12:00:00
categories:
  - 技术
  - AI
tags:
  - Agent开发
  - Python
  - ReAct
  - MCP
  - Tool Calling
---

这篇文章不依赖任何框架（LangChain / CrewAI / AutoGen），只用用纯 Python 把 Agent 的核心骨架、工具调用、MCP 集成、记忆管理、多 Agent 协作到生产部署讲透。
读完你会理解：Agent 的业务逻辑到底是什么，以及如何从零构建一个能在生产环境中可靠运行的 Agent。

---

## 一、核心骨架：50 行 Python 构建一个 Agent

先看完整骨架，再逐一拆解。这个 Agent 可以接收用户指令、调用工具、根据结果继续思考，直到任务完成。

```python
import json
from openai import OpenAI

class Agent:
    def __init__(self, tools: dict[str, callable], system_prompt: str):
        # tools: 工具名 → 可调用函数的映射，如 {"get_weather": get_weather}
        self.tools = tools                    # 工具注册表
        self.system_prompt = system_prompt
        self.messages = [{"role": "system", "content": system_prompt}]
        self.client = OpenAI()

    def run(self, user_input: str) -> str:
        self.messages.append({"role": "user", "content": user_input})

        while True:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=self.messages,
                tools=self._get_tool_schemas()
            )
            msg = response.choices[0].message

            if msg.tool_calls:                          # → 需要调工具
                for tc in msg.tool_calls:
                    name = tc.function.name
                    args = json.loads(tc.function.arguments)
                    result = self.tools[name](**args)   # 执行工具
                    self.messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, ensure_ascii=False)
                    })
            else:                                       # → 最终回答
                return msg.content
```

**拆解四个核心组件**：

| 组件 | 职责 | 代码体现 |
|------|------|---------|
| LLM 调用 | 接收上下文，返回 Thought 或 Tool Call | `client.chat.completions.create()` |
| 工具注册表 | 函数名 → 实际函数映射 | `self.tools` |
| 消息历史 | 存储 system + user + tool 全部消息 | `self.messages` |
| ReAct 循环 | 思考 → 行动 → 观察 → 重复 | `run()` 中的 `while True` |

**运行示例**：

```python
def get_weather(city: str) -> dict:
    return {"city": city, "temp": 25, "condition": "晴朗"}

def add_calendar(event: str, time: str) -> dict:
    return {"status": "success", "event": event, "time": time}

agent = Agent(
    tools={"get_weather": get_weather, "add_calendar": add_calendar},
    system_prompt="你是生活助手。当用户需要查天气时调用 get_weather，需要加日程时调用 add_calendar。"
)

result = agent.run("明天下午去北京野餐，帮我查天气，好的话加日程")
# → "北京明天晴朗，25度，非常适合野餐！已帮您添加'北京野餐'到明天下午的日程。"
```

Agent 循环日志：

```
第1轮：LLM → need get_weather(city="北京")
       Agent 执行 → {"temp": 25, "condition": "晴朗"}
第2轮：LLM → 天气晴朗 → need add_calendar(event="北京野餐", time="明天下午")
       Agent 执行 → {"status": "success"}
第3轮：LLM → 全部完成 → 返回最终回答
```

---

## 二、LLM 集成：封装模型调用

Agent 不应该绑定特定模型。用抽象基类统一接口：

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class LLMResponse:
    content: str | None = None
    tool_calls: list[dict] | None = None

class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list[dict], tools: list[dict] = None) -> LLMResponse:
        pass

class OpenAIProvider(LLMProvider):
    def __init__(self, model: str = "gpt-4o", api_key: str = None):
        self.model = model
        self.client = OpenAI(api_key=api_key)

    def chat(self, messages, tools=None) -> LLMResponse:
        resp = self.client.chat.completions.create(
            model=self.model, messages=messages, tools=tools
        )
        msg = resp.choices[0].message
        if msg.tool_calls:
            return LLMResponse(tool_calls=[
                {"id": tc.id, "name": tc.function.name,
                 "args": json.loads(tc.function.arguments)}
                for tc in msg.tool_calls
            ])
        return LLMResponse(content=msg.content)

class AnthropicProvider(LLMProvider):
    def chat(self, messages, tools=None) -> LLMResponse:
        # 同样的接口，不同的实现
        ...

class OllamaProvider(LLMProvider):
    def chat(self, messages, tools=None) -> LLMResponse:
        # 本地模型，零成本调用
        ...
```

**System Prompt 设计要点**：

| 要素 | 说明 | 示例 |
|------|------|------|
| 角色定义 | 告诉模型"你是谁" | "你是一个拥有10年经验的Python后端工程师" |
| 工具使用规则 | 何时调用工具、如何选工具 | "当需要实时数据时，调用对应工具而非猜测" |
| 输出约束 | 格式要求 | "最终回答使用中文，工具调用参数使用英文" |
| 边界说明 | 明确不能做什么 | "不要执行 rm、sudo 等危险命令" |

**错误处理关键代码**：

```python
def chat_with_retry(self, messages, tools=None, max_retries=3):
    for attempt in range(max_retries):
        try:
            return self.chat(messages, tools)
        except RateLimitError:
            time.sleep(2 ** attempt)        # 指数退避
        except json.JSONDecodeError:
            # LLM 返回了非法 JSON → 让 LLM 自我修正
            messages.append({"role": "user", "content": "你的输出格式错误，请重新输出符合 JSON Schema 的格式。"})
    raise Exception("LLM 调用失败，已达最大重试次数")
```

---

## 三、工具定义与调用

**工具 Schema 设计**（JSON Schema 标准）：

```python
TOOL_GET_WEATHER = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "获取指定城市当前天气信息，包括温度、湿度、天气状况",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名称，如'北京'、'Shanghai'"
                }
            },
            "required": ["city"]
        }
    }
}
```

**工具注册与执行**：

```python
class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, dict] = {}

    def register(self, func: callable, schema: dict):
        """注册工具：函数 + JSON Schema"""
        name = schema["function"]["name"]
        self._tools[name] = {"func": func, "schema": schema}

    def execute(self, name: str, args: dict) -> str:
        """执行工具，统一返回 JSON 字符串"""
        if name not in self._tools:
            return json.dumps({"error": f"工具 '{name}' 不存在"})
        try:
            result = self._tools[name]["func"](**args)
            return json.dumps(result, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_schemas(self) -> list[dict]:
        return [t["schema"] for t in self._tools.values()]

# 使用装饰器注册更优雅
registry = ToolRegistry()

@registry.register(TOOL_GET_WEATHER)
def get_weather(city: str) -> dict:
    # 实际调用天气 API
    return {"city": city, "temp": 25, "humidity": "60%"}
```

**工具调用最佳实践**：

| 实践 | 原因 | 实现 |
|------|------|------|
| 重试 + 自我修正 | 工具执行失败时，把错误信息返回给 LLM 让它重新决策 | `execute()` 返回 error JSON |
| 超时控制 | 防止单个工具调用卡死整个 Agent | `signal.alarm()` 或 `asyncio.wait_for()` |
| 并发 vs 串行 | 读文件可并发，写文件必须串行 | 标记工具属性 `"safe_for_parallel": True` |
| 描述决定准确率 | LLM 根据描述选择工具——描述越清晰，选工具越准 | `description` 字段写详细 |

---

## 四、MCP Server 开发

MCP (Model Context Protocol) 是 AI 工具接口的行业标准。你写的 MCP Server 可以被任何支持 MCP 的 AI 应用使用。

**用 Python 从零构建**：

```python
# weather_server.py
import json
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

server = Server("weather-server")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_weather",
            description="获取指定城市当前天气信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名称"}
                },
                "required": ["city"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "get_weather":
        city = arguments["city"]
        # 实际调用天气 API
        result = {"city": city, "temp": 25, "condition": "晴朗"}
        return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False))]
    raise ValueError(f"未知工具: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

**配置使用**（在 Claude Desktop / Cursor 中）：

```json
{
  "mcpServers": {
    "weather": {
      "command": "python",
      "args": ["weather_server.py"],
      "env": {"OPENWEATHER_API_KEY": "your_key"}
    }
  }
}
```

**MCP 三种能力对比**：

| 能力 | 用途 | 谁控制 | 示例 |
|------|------|--------|------|
| Tools | 可执行操作 | LLM 决定何时调用 | 查天气、发邮件、查数据库 |
| Resources | 只读数据暴露 | Agent 按需读取 | 文档内容、数据库 Schema |
| Prompts | 预置提示模板 | 用户手动触发 | "帮我审查这段代码的安全性" |

---

## 五、记忆与上下文管理

**三层记忆架构**：

| 层级 | 存储位置 | 生命周期 | 容量 |
|------|---------|----------|------|
| 短期记忆 | `self.messages` 列表 | 单次会话 | 受 Context Window 限制 |
| 中期记忆 | 向量数据库 + RAG | 跨会话（数天到数周） | 几十万条 |
| 长期记忆 | 配置文件 / 数据库 | 永久 | 项目规则、用户偏好 |

**短期记忆实现**：

```python
class Memory:
    def __init__(self, max_tokens: int = 8000):
        self.messages: list[dict] = []
        self.max_tokens = max_tokens

    def add(self, message: dict):
        self.messages.append(message)
        self._compact_if_needed()

    def _compact_if_needed(self):
        """当 Token 用量接近上限时，自动压缩"""
        while self._estimate_tokens() > self.max_tokens:
            removed = self.messages.pop(1)  # 保留 system prompt
            # 可选：将 removed 的内容用 LLM 总结后保留

    def _estimate_tokens(self) -> int:
        """粗略估算：中文约 1 字 ≈ 1 Token，英文约 4 字符 ≈ 1 Token"""
        total = sum(len(str(m.get("content", ""))) for m in self.messages)
        return int(total * 0.6)  # 经验系数（工程估算，非精确值）
        # 注意：不同模型分词器不同（Claude 用 BPE，GPT 用 tiktoken）
        # 如需精确控制 Token，建议使用 tiktoken 库

    def get_context(self, last_n: int = None) -> list[dict]:
        return self.messages if last_n is None else self.messages[-last_n:]
```

**长期记忆集成（向量数据库）**：

```python
class LongTermMemory:
    def __init__(self, vector_db, embedder):
        self.db = vector_db      # 如 ChromaDB / Milvus / PGVector
        self.embedder = embedder  # 如 text-embedding-3-small

    def store(self, content: str, metadata: dict):
        embedding = self.embedder.embed(content)
        self.db.insert(embedding=embedding, metadata=metadata, text=content)

    def retrieve(self, query: str, top_k: int = 5) -> list[str]:
        embedding = self.embedder.embed(query)
        results = self.db.search(embedding, top_k)
        return [r["text"] for r in results]

# 在 Agent 中使用
class AgentWithMemory(Agent):
    def __init__(self, *args, long_term_memory: LongTermMemory = None, **kwargs):
        super().__init__(*args, **kwargs)
        self.ltm = long_term_memory

    def run(self, user_input: str) -> str:
        if self.ltm:
            # 注入相关知识到上下文
            relevant = self.ltm.retrieve(user_input, top_k=3)
            self.memory.add({
                "role": "system",
                "content": "相关历史信息：\n" + "\n".join(relevant)
            })
        return super().run(user_input)
```

---

## 六、Skill 加载

Skill 是"可复用的流程级指令包"。Prompt 是"一次性指令"，Skill 是"菜谱"——每次自动按流程来。

**SKILL.md 编写规范**：

```markdown
# Skill: PR 代码审查

## 触发条件
当用户请求审查代码变更、PR 或 git diff 时自动激活。

## 前置准备
1. 使用 `git diff` 获取所有变更文件列表
2. 排除自动生成的文件（*.min.js, *.lock, package-lock.json）

## 审查流程
对每个变更文件，按以下顺序检查：

### 1. 安全检查（最高优先级）
- SQL 注入：是否有字符串拼接的 SQL 语句？
- XSS：是否有未转义的用户输入直接输出到 HTML？
- 敏感信息：是否硬编码了密钥、Token、密码？

### 2. 逻辑正确性
- 边界条件：空数组、null、0 值是否处理？
- 错误处理：异常是否正确捕获和传播？

### 3. 性能
- 循环内是否有不必要的数据库查询？
- 大数据量操作是否有分页？

## 输出格式
- 🔴 严重：必须修复（有安全风险或逻辑错误）
- 🟡 建议：建议优化（性能或可读性问题）
- 🔵 风格：可选（代码风格建议）
```

**SkillLoader 加载机制**：

```python
from pathlib import Path

class SkillLoader:
    def __init__(self, skills_dir: str):
        self.skills = {}
        for skill_file in Path(skills_dir).rglob("SKILL.md"):
            name = skill_file.parent.name
            content = skill_file.read_text(encoding="utf-8")
            self.skills[name] = self._parse(content)

    def _parse(self, content: str) -> dict:
        """解析 SKILL.md 为结构化对象"""
        return {
            "raw": content,
            "trigger": self._extract_section(content, "触发条件"),
            "workflow": self._extract_section(content, "审查流程"),
            "output_format": self._extract_section(content, "输出格式"),
        }

    def match(self, user_input: str) -> list[str]:
        """根据用户输入匹配相关技能"""
        matched = []
        for name, skill in self.skills.items():
            for keyword in skill.get("trigger", "").split():
                if keyword.lower() in user_input.lower():
                    matched.append(name)
        return matched

    def inject(self, system_prompt: str, skill_name: str) -> str:
        """将技能注入到 system prompt 中"""
        skill = self.skills[skill_name]
        return f"{system_prompt}\n\n## 当前激活技能：{skill_name}\n{skill['raw']}"
```

---

## 七、多 Agent 协作

当一个 Agent 搞不定复杂任务时，需要多个 Agent 分工协作。

**四种编排模式**：

| 模式 | 结构 | 适用场景 | 关键特征 |
|------|------|---------|----------|
| **DAG** | 固定流程 A→B→C | 文档处理流水线 | 任务依赖图，可并行 |
| **Supervisor** | 一个主管分配任务 | 代码审查 + 修复 | 集中决策，分工明确 |
| **Swarm** | 多个平等 Agent 自主认领 | 并行搜索 + 汇总 | 去中心化，弹性伸缩 |
| **Handoff** | Agent A 完成后交接给 Agent B | 客服 → 技术专家 | 按阶段接力 |

**Supervisor 模式实现**：

```python
class SupervisorAgent:
    def __init__(self, workers: dict[str, Agent], llm: LLMProvider):
        self.workers = workers
        self.llm = llm

    def run(self, task: str) -> str:
        # Step 1: LLM 拆解任务
        plan = self._decompose(task)
        # 如: [{"worker": "searcher", "task": "搜索相关资料"},
        #      {"worker": "coder",   "task": "根据资料写代码"},
        #      {"worker": "reviewer", "task": "审查代码质量和安全"}]

        results = {}
        for step in plan:
            worker_name = step["worker"]
            subtask = step["task"]
            results[worker_name] = self.workers[worker_name].run(subtask)

        # Step 2: LLM 汇总结果
        summary = self._synthesize(task, results)
        return summary

    def _decompose(self, task: str) -> list[dict]:
        prompt = f"""你是任务规划专家。将以下任务拆解为子任务，分配给可用的 Worker。
可用 Worker: {list(self.workers.keys())}
任务: {task}
输出 JSON: [{{"worker": "...", "task": "..."}}]"""
        resp = self.llm.chat([{"role": "user", "content": prompt}])
        return json.loads(resp.content)

    def _synthesize(self, task: str, results: dict) -> str:
        prompt = f"""原始任务: {task}\n各 Worker 结果: {results}\n请汇总成最终回答。"""
        return self.llm.chat([{"role": "user", "content": prompt}]).content
```

**Handoff 模式实现**：

```python
class HandoffAgent:
    def __init__(self, agents: dict[str, Agent]):
        self.agents = agents
        self.current = "general"  # 当前活跃 Agent

    def run(self, user_input: str) -> str:
        # 判断是否需要切换 Agent
        switch = self._should_switch(user_input)
        if switch and switch != self.current:
            self.current = switch
            return f"正在转接给 {switch} 专家..."

        result = self.agents[self.current].run(user_input)

        # 检查是否需要交接（通过 JSON 结构化输出触发）
        # 生产环境建议使用 structured output，而非字符串匹配
        try:
            handoff = json.loads(result)
            if handoff.get("action") == "handoff":
                self.current = handoff["target"]
                return self.agents[self.current].run(user_input)
        except (json.JSONDecodeError, KeyError):
            pass
        return result
```

**Swarm 模式实现**：真正的 Swarm 模式核心是"去中心化"——没有主管分配任务，每个 Worker 自主从队列中认领工作。以下用线程 + 队列模拟这一模式：

```python
import threading
from queue import Queue

class SwarmAgent:
    """蜂群模式：多个平等 Agent 从任务队列中自主认领任务"""
    def __init__(self, workers: dict[str, Agent]):
        self.workers = workers
        self.task_queue = Queue()
        self.results = {}

    def run(self, tasks: list[dict]) -> dict:
        # 将所有子任务放入队列
        for task in tasks:
            self.task_queue.put(task)

        # 每个 Worker 启动一个线程，自主从队列中抢任务
        threads = []
        for name, agent in self.workers.items():
            t = threading.Thread(target=self._worker_loop, args=(name, agent))
            threads.append(t)
            t.start()

        # 等待所有任务完成
        self.task_queue.join()
        for t in threads:
            t.join()

        return self.results

    def _worker_loop(self, name: str, agent: Agent):
        while not self.task_queue.empty():
            try:
                task = self.task_queue.get_nowait()
                result = agent.run(task["description"])
                self.results[task["id"]] = result
                self.task_queue.task_done()
            except Exception:
                pass  # 队列空了，退出
```

---

## 八、Agent 测试与调试

Agent 的测试难点：**非确定性输出**——同一个输入，每次结果可能不同。

**测试金字塔**：

| 层级 | 方法 | 测试什么 | 示例 |
|------|------|---------|------|
| 单元测试 | 直接调用函数 | 单个 Tool 逻辑正确 | `assert get_weather("北京")["city"] == "北京"` |
| 集成测试 | Mock LLM 返回 | Agent 循环逻辑 | 固定 LLM 返回 tool_call, 验证 Agent 是否正确执行 |
| E2E 测试 | 真实 LLM + 测试集 | 整体质量 | 10 个标准任务, 人工评估完成率 |
| 评估基准 | LLM-as-Judge | 对比不同版本 | 用 GPT-4 给 Agent 的回答打分 (1-5) |

**集成测试示例**，核心思路是构造一个"假 LLM"（MockLLM），预设两轮回复——第一轮返回 tool_call，第二轮返回最终回答。然后验证 Agent 是否正确串联了"调工具 → 拿结果 → 生成回答"的完整流程。

先定义 MockLLM：

```python
class MockLLM(LLMProvider):
    """预设响应序列的假 LLM，用于测试 Agent 循环逻辑"""
    def __init__(self, responses: list[LLMResponse]):
        self.responses = responses
        self.call_count = 0

    def chat(self, messages, tools=None) -> LLMResponse:
        resp = self.responses[self.call_count]
        self.call_count += 1
        return resp
```

正常路径测试：

```python
def test_agent_loop_with_mock_llm():
    # 构造一个"假 LLM"：第一次返回 tool_call，第二次返回 final answer
    mock_llm = MockLLM(responses=[
        LLMResponse(tool_calls=[{"id": "1", "name": "get_weather", "args": {"city": "北京"}}]),
        LLMResponse(content="北京天气晴朗，25度")
    ])
    agent = Agent(tools={"get_weather": lambda city: {"temp": 25}}, llm=mock_llm)
    result = agent.run("北京天气怎么样？")
    assert "晴朗" in result
    assert "25度" in result
```

工具失败恢复测试：

```python
def test_agent_handles_tool_failure():
    """工具返回错误后，Agent 应能恢复并继续执行"""
    mock_llm = MockLLM(responses=[
        # 第一轮：调用工具
        LLMResponse(tool_calls=[{"id": "1", "name": "get_weather", "args": {"city": "北京"}}]),
        # 第二轮：看到错误后，换一种方式回答
        LLMResponse(content="抱歉，天气服务暂时不可用，请稍后再试。")
    ])

    def failing_weather(city):
        raise ConnectionError("天气 API 超时")

    agent = Agent(tools={"get_weather": failing_weather}, llm=mock_llm)
    result = agent.run("北京天气怎么样？")
    assert "不可用" in result or "稍后" in result
```

**Agent 调试技巧**，给 Agent 加"调试追踪"能力，核心思路是继承 Agent，新增一个 `self.trace` 列表来记录每一轮 ReAct 循环的完整过程。

```python
class DebugAgent(Agent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trace = []  # 完整追踪

    def run(self, user_input: str) -> str:
        self.trace = []
        self.messages.append({"role": "user", "content": user_input})

        round_num = 0
        while True:
            round_num += 1
            response = self._call_llm()
            self.trace.append({
                "round": round_num,
                "messages_count": len(self.messages),
                "estimated_tokens": self._estimate_tokens()
            })

            if response.tool_calls:
                for tc in response.tool_calls:
                    self.trace[-1]["tool_calls"] = tc
                    result = self._execute_tool(tc)
                    self.trace[-1]["tool_result"] = result[:200]  # 截断
            else:
                self.trace[-1]["final_answer"] = response.content
                self._print_trace()
                return response.content

    def _print_trace(self):
        for t in self.trace:
            print(f"--- Round {t['round']} (messages: {t['messages_count']}, "
                  f"~{t['estimated_tokens']} tokens) ---")
            if "tool_calls" in t:
                print(f"  Tool Call: {t['tool_calls']['name']}({t['tool_calls']['args']})")
                print(f"  Result: {t['tool_result']}")
            else:
                print(f"  Answer: {t['final_answer'][:100]}...")
```

具体来说，`DebugAgent` 做了三件事：

**1. 每轮记录元数据**

每轮循环开始前，记录：
- `round`：第几轮思考
- `messages_count`：当前消息列表长度（观察上下文膨胀情况）
- `estimated_tokens`：估算当前 Token 用量

**2. 区分两条路径**

- **调工具路径**：记录调了什么工具（`name`）、传了什么参数（`args`）、工具返回了什么（`tool_result`，截断前 200 字符防止日志爆炸）
- **最终回答路径**：记录最终回答内容，然后调用 `_print_trace()` 输出全链路日志

**3. 打印追踪日志**

输出格式大致是：
```
--- Round 1 (messages: 3, ~1200 tokens) ---
  Tool Call: get_weather({'city': '北京'})
  Result: {"temp": 25, "condition": "晴朗"}
--- Round 2 (messages: 5, ~1800 tokens) ---
  Answer: 北京天气晴朗，25度...
```

> **价值**：让开发者能直观看到 Agent 的"思考链路"——每一轮在做什么、上下文有多大、调了哪些工具、工具返回了什么，方便排查 Agent 为什么做出了某个决策。这是调试非确定性输出系统的必备工具。


---

## 九、部署与生产

**部署架构**：

| 层级 | 技术选型 | 关注点 |
|------|---------|--------|
| 推理层 | 云端 API (GPT-4o) / 本地 GPU (vLLM) | 延迟 < 2s, 成本控制 |
| 编排层 | FastAPI + asyncio | 并发处理、超时、熔断 |
| 存储层 | PostgreSQL + ChromaDB | 持久化、检索速度 |
| 监控层 | OpenTelemetry → Grafana | Token 用量、工具调用链、错误率 |

> 部署本地模型时，vLLM 是目前性能最优的开源推理引擎之一，支持 PagedAttention 高吞吐推理。

**安全底线**：

```python
class SecureAgent(Agent):
    DANGEROUS_COMMANDS = ["rm -rf", "sudo", "chmod 777", "DROP TABLE", "format"]

    def _execute_tool(self, tool_call) -> str:
        # 安全检查
        if tool_call["name"] == "bash":
            cmd = tool_call["args"].get("command", "")
            if any(dangerous in cmd for dangerous in self.DANGEROUS_COMMANDS):
                return json.dumps({"error": "危险命令被拦截", "command": cmd})

        # 需要人工确认
        if tool_call["name"] in ["git_push", "deploy", "delete_file"]:
            confirm = input(f"确认执行 {tool_call['name']}? (yes/no): ")
            if confirm.lower() != "yes":
                return json.dumps({"error": "用户取消操作"})

        return super()._execute_tool(tool_call)
```

**成本控制**：

```python
class CostTracker:
    PRICING = {
        "gpt-4o":  {"input": 0.0025, "output": 0.01},   # 每 1K tokens 美元
        "claude-3": {"input": 0.003,  "output": 0.015},
    }

    def __init__(self, budget: float = 10.0):
        self.budget = budget
        self.spent = 0.0

    def track(self, model: str, input_tokens: int, output_tokens: int):
        price = self.PRICING.get(model, {"input": 0.001, "output": 0.004})
        cost = (input_tokens / 1000) * price["input"] + (output_tokens / 1000) * price["output"]
        self.spent += cost
        if self.spent > self.budget * 0.8:
            print(f"⚠️ 预算警告：已使用 {self.spent:.2f}/{self.budget:.2f} 美元")
        if self.spent > self.budget:
            raise RuntimeError(f"预算耗尽：{self.spent:.2f} > {self.budget:.2f}")
```

---

> **小结**：Agent 开发不是调 API 那么简单——从 LLM 封装、工具定义、记忆管理、MCP 集成，到测试、安全、部署，每一个环节都需要工程化的思考。但核心模式是通用的：掌握了这篇文章中的设计模式，你可以在任何框架（或不使用框架）中构建出可靠的 Agent 系统。