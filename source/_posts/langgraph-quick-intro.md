---
title: LangGraph 快速入门
date: 2026-07-01 10:00:00
categories:
  - 技术
  - AI
tags:
  - Agent开发
  - LangGraph
  - LangChain
  - 代码审计
  - 状态图
---

> 本文是 Agent 开发系列的第四篇。前序阅读：[Agent 概念入门](/blog/2026/06/agent-quick-intro/) → [纯 Python 从零实现 Agent](/blog/2026/06/agent-dev-quick-intro/) → [LangChain 快速入门](/blog/2026/06/langchain-quick-intro/)。本篇用 LangGraph 构建一个**多 Agent 代码审计系统**——Supervisor 调度 Searcher、Auditor、Reporter 三个专业 Agent 并行审计整个目录，支持人工审批严重漏洞。下一篇介绍 [DeepAgents 快速入门](/blog/2026/07/deepagents-quick-intro/)——基于 LangGraph 的"电池全装好的 Agent 底盘"。

---

## 一、LangGraph 是什么

**LangGraph 是用"状态图"编排 Agent 的框架**——把 Agent Loop 表达为节点（Node）+ 边（Edge）+ 状态（State）的图结构。

### 1.1 为什么需要 LangGraph

上一篇文章讲的 LangChain AgentExecutor 是**单 Agent 串行执行**：

```
用户 → Agent → 工具1 → Agent → 工具2 → Agent → ... → 结果
```

但真实审计场景需要**多 Agent 协作**：
- 搜索 Agent 扫描整个目录，提取可疑代码
- 审计 Agent 对可疑代码进行漏洞检测
- 报告 Agent 汇总所有发现，生成审计报告
- 严重漏洞需要人工确认后才放行

LangGraph 用**图论**解决这个问题：节点是 Agent，边是调度逻辑，状态是共享数据。

### 1.2 LangGraph 与 LangChain 的关系

```
LangChain（组件层）  →  LangGraph（编排层）  →  DeepAgents（电池全装好的底盘）
  ↓                       ↓
  ChatModel, Tool,         StateGraph, Node, Edge,
  Retriever, Chain         Checkpointing, Human-in-the-Loop
```

LangGraph **依赖** LangChain 的 Runnable 接口，但专注于**编排层**——Agent Loop、多 Agent 协作、状态持久化。

### 1.3 与纯 Python ReAct 循环的对比

| 维度 | 纯 Python ReAct | LangChain AgentExecutor | LangGraph |
|------|----------------|------------------------|-----------|
| 循环控制 | `while True` + `if/else` | 框架自动 | `StateGraph` + `add_conditional_edges` |
| 状态管理 | 手动维护 messages | 手动维护 messages | `TypedDict` State 自动传递 |
| 多 Agent | 手动实现 | 不支持 | 原生支持（Supervisor/Handoff） |
| 可视化 | 无 | 无 | 内置图可视化 |
| 持久化 | 手动实现 | 手动实现 | `MemorySaver` / `SqliteSaver` |
| 人在回路 | 手动 `input()` | 不支持 | `interrupt_before` / `interrupt_after` |

### 1.4 安装

```bash
pip install langgraph langchain-openai
```

当前版本：`langgraph` v0.4.x（2026 年 7 月）。

---

## 二、核心概念——状态、节点、边

LangGraph 的三个核心概念：

| 概念 | 说明 | 类比 |
|------|------|------|
| **State** | 图中流动的数据，所有节点共享 | 函数参数 + 返回值 |
| **Node** | 计算单元，接收 State、返回 State 更新 | 函数 |
| **Edge** | 节点间的连接，决定执行顺序 | 控制流（if/else/循环） |

### 2.1 State：状态定义

```python
from typing import TypedDict, Annotated
from langgraph.graph import add_messages

class AgentState(TypedDict):
    """Agent 的状态定义"""
    messages: Annotated[list, add_messages]  # 消息列表，自动追加（而非覆盖）
    current_step: str  # 当前步骤
```

- `TypedDict`：类型化的字典，定义 Schema
- `Annotated[list, add_messages]`：使用 `add_messages` reducer，自动追加新消息
- 所有节点共享同一个 State 对象

### 2.2 Node：节点函数

```python
def agent_node(state: AgentState) -> dict:
    """Agent 节点：调用 LLM 决定下一步"""
    response = llm.invoke(state["messages"])
    # 返回状态更新（部分更新，不是覆盖）
    return {"messages": [response], "current_step": "agent_called"}
```

### 2.3 Edge：三种边

```python
from langgraph.graph import StateGraph, START, END

graph = StateGraph(AgentState)

# 1. 普通边：A 执行完一定到 B
graph.add_edge("node_a", "node_b")

# 2. 条件边：根据 router 函数决定下一步
def router(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "end"

graph.add_conditional_edges("agent", router, {
    "tools": "tool_node",
    "end": END
})

# 3. 入口边：从 START 到第一个节点
graph.add_edge(START, "agent")
```

### 2.4 完整示例：最简两节点图

```python
from typing import TypedDict
from langgraph.graph import StateGraph, START, END

class SimpleState(TypedDict):
    count: int
    log: list

def increment(state: SimpleState) -> dict:
    """节点 A：计数加 1"""
    new_count = state["count"] + 1
    return {"count": new_count, "log": state["log"] + [f"增加到 {new_count}"]}

def log_result(state: SimpleState) -> dict:
    """节点 B：记录结果"""
    return {"log": state["log"] + ["记录完成"]}

# 构建图
graph = StateGraph(SimpleState)
graph.add_node("increment", increment)
graph.add_node("log", log_result)

graph.add_edge(START, "increment")
graph.add_edge("increment", "log")
graph.add_edge("log", END)

# 编译并运行
app = graph.compile()
result = app.invoke({"count": 0, "log": []})

print(result["count"])  # 1
print(result["log"])    # ["增加到 1", "记录完成"]
```

### 2.5 条件路由图

```python
from typing import Literal

class RouterState(TypedDict):
    query: str
    result: str

def router(state: RouterState) -> Literal["search", "calculate"]:
    """路由节点：根据查询内容决定走搜索还是计算"""
    if any(word in state["query"] for word in ["+", "-", "*", "/"]):
        return "calculate"
    return "search"

def search_node(state: RouterState) -> dict:
    return {"result": f"搜索 '{state['query']}' 的结果..."}

def calculate_node(state: RouterState) -> dict:
    return {"result": f"计算 '{state['query']}' = {eval(state['query'])}"}

graph = StateGraph(RouterState)
graph.add_node("search", search_node)
graph.add_node("calculate", calculate_node)

graph.add_edge(START, "router")
graph.add_conditional_edges("router", router)
graph.add_edge("search", END)
graph.add_edge("calculate", END)

app = graph.compile()
print(app.invoke({"query": "123 * 456", "result": ""}))
# {"query": "123 * 456", "result": "计算 '123 * 456' = 56088"}
```

---

## 三、ReAct Agent 的图表达

### 3.1 ReAct 的图结构

```
    ┌─────────┐
    │  START  │
    └────┬────┘
         │
    ┌────▼────┐
    │  agent  │ ←─── 调用 LLM
    └────┬────┘
         │
    ┌────▼────────────┐
    │  条件边（router）│
    └────┬────────┬───┘
         │        │
    有 tool_calls  无 tool_calls
         │        │
    ┌────▼────┐   │
    │  tools  │   │
    └────┬────┘   │
         │        │
         └───┐    │
             │    │
        ┌────▼────▼────┐
        │     END      │
        └──────────────┘
```

### 3.2 手写 ReAct Agent

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END, add_messages
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

# 定义工具
@tool
def search_web(query: str) -> str:
    """搜索互联网"""
    return f"搜索结果：关于 '{query}' 的信息..."

@tool
def calculate(expression: str) -> str:
    """计算数学表达式"""
    return str(eval(expression))

tools = [search_web, calculate]
tool_map = {t.name: t for t in tools}

# 状态定义
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

# LLM + 工具绑定
llm = ChatOpenAI(model="gpt-4o").bind_tools(tools)

# Agent 节点：调用 LLM
def agent_node(state: AgentState) -> dict:
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# 工具节点：执行工具调用
def tool_node(state: AgentState) -> dict:
    last_message = state["messages"][-1]
    results = []
    for tc in last_message.tool_calls:
        tool_result = tool_map[tc["name"]].invoke(tc["args"])
        results.append({"role": "tool", "content": tool_result, "tool_call_id": tc["id"]})
    return {"messages": results}

# 路由函数
def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "end"

# 构建图
graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue, {"tools": "tools", "end": END})
graph.add_edge("tools", "agent")  # 工具执行后回到 agent

app = graph.compile()

# 运行
result = app.invoke({
    "messages": [{"role": "user", "content": "计算 123*456"}]
})
```

### 3.3 使用内置 create_react_agent

LangGraph 提供了更简洁的工厂函数：

```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    model=ChatOpenAI(model="gpt-4o"),
    tools=[search_web, calculate]
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "计算 123*456"}]
})
```

**手写 vs 工厂函数**：

| 场景 | 选择 |
|------|------|
| 快速原型、标准 ReAct | `create_react_agent()` |
| 自定义节点逻辑、复杂条件分支 | 手写 `StateGraph` |
| 多 Agent 协作（Supervisor） | 手写 `StateGraph` |

### 3.4 流式输出

```python
for event in app.stream(
    {"messages": [{"role": "user", "content": "计算 1+2+3"}]},
    stream_mode="updates"
):
    print(event)
    # {"agent": {"messages": [...]}}
    # {"tools": {"messages": [...]}}
```

---

## 四、实战——用 LangGraph 构建多 Agent 代码审计系统

> 参照 [DeepAgents 快速入门](/blog/2026/07/deepagents-quick-intro/) 的四 Agent 架构，用 LangGraph 的 Supervisor 模式实现。

### 4.1 审计目标

审计整个 `src/` 目录，多 Agent 并行扫描，人工审批严重漏洞：

| Agent | 角色 | 核心职责 |
|-------|------|---------|
| **Supervisor** | 总调度 | 根据审计进度决定调度哪个 Agent |
| **Searcher** | 代码侦查员 | 扫描目标目录，提取可疑代码片段 |
| **Auditor** | 安全审计师 | 对可疑代码进行漏洞检测 |
| **Reporter** | 报告撰写员 | 汇总所有发现，生成审计报告 |

### 4.2 架构设计

```
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Supervisor  │ ←─── 决定调度谁
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼─────┐ ┌───▼───────┐
       │  Searcher   │ │Auditor │ │ Reporter  │
       └──────┬──────┘ └──┬─────┘ └───┬───────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │ Supervisor  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    END      │
                    └─────────────┘
```

### 4.3 定义 State

```python
from typing import TypedDict, Annotated
from langgraph.graph import add_messages

class AuditState(TypedDict):
    """审计状态"""
    messages: Annotated[list, add_messages]  # 对话历史
    target_dir: str                          # 审计目标目录
    scan_results: list                       # 扫描发现的可疑代码片段
    findings: list                           # 审计发现的漏洞
    report: str                              # 最终审计报告
    next_agent: str                          # Supervisor 决定调度的下一个 Agent
```

### 4.4 实现各节点

```python
from langchain_openai import ChatOpenAI
import os
import glob

# Searcher 节点：扫描代码库
def searcher_node(state: AuditState) -> dict:
    """搜索 Agent：扫描目标目录，提取可疑代码片段"""
    target_dir = state.get("target_dir", "./src")
    
    # 扫描所有 Python 文件
    suspicious = []
    for filepath in glob.glob(f"{target_dir}/**/*.py", recursive=True):
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        # 简单规则：包含 SQL、password、exec 等关键词
        if any(kw in content.lower() for kw in ["select", "password", "exec", "eval", "innerhtml"]):
            suspicious.append({"file": filepath, "content": content[:2000]})
    
    return {
        "scan_results": suspicious,
        "messages": [{"role": "assistant", "content": f"[Searcher] 扫描完成，发现 {len(suspicious)} 个可疑文件"}]
    }

# Auditor 节点：漏洞检测
def auditor_node(state: AuditState) -> dict:
    """审计 Agent：对可疑代码进行漏洞检测"""
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    
    findings = []
    for item in state.get("scan_results", []):
        prompt = f"""审计以下代码，找出安全漏洞（SQL注入、硬编码凭据、XSS）。
对每个漏洞，给出：漏洞名称、CWE编号、严重等级（严重/高危/中危/低危）、文件位置、修复建议。

文件：{item['file']}
代码：
{item['content']}"""
        
        response = llm.invoke(prompt)
        if "漏洞" in response.content or "CWE" in response.content:
            findings.append({"file": item["file"], "analysis": response.content})
    
    return {
        "findings": findings,
        "messages": [{"role": "assistant", "content": f"[Auditor] 审计完成，发现 {len(findings)} 个文件存在漏洞"}]
    }

# Reporter 节点：生成报告
def reporter_node(state: AuditState) -> dict:
    """报告 Agent：汇总所有发现，生成审计报告"""
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    
    findings_text = "\n\n".join([
        f"文件：{f['file']}\n{f['analysis']}" for f in state.get("findings", [])
    ])
    
    prompt = f"""根据以下审计发现，生成一份结构化的代码安全审计报告。

审计目标：{state.get('target_dir', './src')}
审计发现：
{findings_text}

报告格式要求：
1. 审计摘要（扫描文件数、发现漏洞数、各等级统计）
2. 严重漏洞详情（CWE编号、位置、攻击场景、修复代码）
3. 合规检查建议"""
    
    response = llm.invoke(prompt)
    
    return {
        "report": response.content,
        "messages": [{"role": "assistant", "content": "[Reporter] 审计报告已生成"}]
    }

# Supervisor 节点：调度决策
def supervisor_node(state: AuditState) -> dict:
    """Supervisor：根据当前状态决定下一步调度哪个 Agent"""
    # 简单规则：scan_results 为空 → 先搜索；findings 为空 → 审计；否则 → 报告
    if not state.get("scan_results"):
        next_agent = "searcher"
    elif not state.get("findings"):
        next_agent = "auditor"
    elif not state.get("report"):
        next_agent = "reporter"
    else:
        next_agent = "end"
    
    return {
        "next_agent": next_agent,
        "messages": [{"role": "assistant", "content": f"[Supervisor] 调度 {next_agent}"}]
    }
```

### 4.5 构建 Supervisor 图

```python
from langgraph.graph import StateGraph, START, END

# 路由函数
def route_supervisor(state: AuditState) -> str:
    return state.get("next_agent", "end")

# 构建图
graph = StateGraph(AuditState)

# 添加节点
graph.add_node("supervisor", supervisor_node)
graph.add_node("searcher", searcher_node)
graph.add_node("auditor", auditor_node)
graph.add_node("reporter", reporter_node)

# 添加边
graph.add_edge(START, "supervisor")
graph.add_conditional_edges("supervisor", route_supervisor, {
    "searcher": "searcher",
    "auditor": "auditor",
    "reporter": "reporter",
    "end": END
})
graph.add_edge("searcher", "supervisor")   # 完成后回到 supervisor
graph.add_edge("auditor", "supervisor")
graph.add_edge("reporter", "supervisor")

# 编译
audit_app = graph.compile()
```

### 4.6 运行审计

```python
result = audit_app.invoke({
    "target_dir": "./src/api",
    "scan_results": [],
    "findings": [],
    "report": "",
    "messages": []
})

print(result["report"])
```

**运行日志**：

```
[Supervisor] 调度 searcher
[Searcher] 扫描完成，发现 23 个可疑文件
[Supervisor] 调度 auditor
[Auditor] 审计完成，发现 8 个文件存在漏洞
[Supervisor] 调度 reporter
[Reporter] 审计报告已生成
[Supervisor] 调度 end
```

### 4.7 审计报告示例

```markdown
# 代码安全审计报告

项目：src/api/ | 日期：2026-07-01 | 扫描文件：47 | 可疑文件：23

## 审计摘要

| 严重等级 | 数量 |
|---------|------|
| 严重 | 3 |
| 高危 | 5 |
| 中危 | 4 |
| 低危 | 1 |
| **合计** | **13** |

## 严重漏洞

### [严重] CWE-89 SQL 注入 - `src/api/auth.py:47`
`query = f"SELECT * FROM users WHERE username='{username}'"`
→ 修复：`cursor.execute("SELECT * FROM users WHERE username=?", (username,))`

### [严重] CWE-798 硬编码凭据 - `src/config/database.py:12`
`DATABASE_URL = "mysql://admin:MyP@ssw0rd123@localhost:3306/shopx"`
→ 修复：`DATABASE_URL = os.getenv("DATABASE_URL")`

### [严重] CWE-284 水平越权 - `src/api/order.py:112`
`return Order.query.get(order_id)` // 未校验所有权
→ 修复：`if order.user_id != current_user.id: raise Forbidden`
```

---

## 五、Human-in-the-Loop 与状态持久化

### 5.1 HITL：严重漏洞人工审批

当审计发现严重漏洞时，需要人工确认后才生成最终报告：

```python
from langgraph.checkpoint.memory import MemorySaver

# 编译时配置中断点
checkpointer = MemorySaver()

audit_app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["reporter"]  # 在生成报告前暂停，等待人工审批
)

# 第一次运行：会在 reporter 节点前暂停
config = {"configurable": {"thread_id": "audit-2026-07-01"}}
result = audit_app.invoke(
    {"target_dir": "./src/api", "scan_results": [], "findings": [], "report": "", "messages": []},
    config=config
)

# 此时 Agent 暂停，等待人工确认
print("审计发现严重漏洞，等待人工审批...")
print(f"当前发现：{result['findings']}")

# 人工确认后，继续执行
result = audit_app.invoke(None, config=config)  # 传入 None 表示继续
print(result["report"])
```

### 5.2 检查点：保存审计进度

```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver

# 内存检查点（开发用）
memory = MemorySaver()

# SQLite 检查点（轻量持久化）
sqlite = SqliteSaver.from_conn_string("./audit_checkpoints.db")

# PostgreSQL 检查点（生产级）
from langgraph.checkpoint.postgres import PostgresSaver
postgres = PostgresSaver.from_conn_string("postgresql://...")

# 使用
audit_app = graph.compile(checkpointer=sqlite)
```

### 5.3 长任务恢复：审计中断后继续

```python
# 审计中途断电或超时，从检查点恢复
config = {"configurable": {"thread_id": "audit-2026-07-01"}}

# 恢复执行（自动从上次中断的节点继续）
result = audit_app.invoke(None, config=config)
```

### 5.4 时间旅行：回溯到任意历史状态

```python
# 获取所有历史检查点
history = list(audit_app.get_state_history(config))

# 回溯到某个历史状态（比如想重新审计某个文件）
past_state = history[3]  # 第 4 个历史状态

result = audit_app.invoke(None, {
    "configurable": {
        "thread_id": "audit-2026-07-01",
        "checkpoint_id": past_state.config["configurable"]["checkpoint_id"]
    }
})
```

### 5.5 Streaming 三种模式

```python
# 模式 1：values - 每步输出完整状态
for event in audit_app.stream(input, stream_mode="values"):
    print(event)  # {"messages": [...], "scan_results": [...], ...}

# 模式 2：updates - 每步只输出增量
for event in audit_app.stream(input, stream_mode="updates"):
    print(event)  # {"searcher": {"scan_results": [...新增...]}}

# 模式 3：messages - 逐 Token 流式输出 LLM 生成
for event in audit_app.stream(input, stream_mode="messages"):
    print(event)  # (AIMessageChunk, metadata)
```

| 模式 | 输出内容 | 适用场景 |
|------|---------|---------|
| `values` | 每步完整状态 | 调试、查看全局进度 |
| `updates` | 每步状态增量 | 实时显示当前节点输出 |
| `messages` | 逐 Token 流式 | 前端实时渲染 LLM 生成 |

---

## 六、生产部署与选型

### 6.1 LangGraph Platform

LangGraph Platform 是 LangGraph 的生产化部署方案：

| 能力 | 说明 |
|------|------|
| REST API | 自动生成 `/threads`、`/runs`、`/stream` 等端点 |
| 持久化 | 内置 PostgreSQL 检查点存储 |
| 监控 | 与 LangSmith 集成，自动 Trace |
| HITL 暂停 | 可等待人工审批数小时甚至数天 |
| 多租户 | 不同用户的 Agent 会话隔离 |

### 6.2 与 LangSmith 集成

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-key"

# LangGraph 自动上报每个节点的 Trace
audit_app.invoke(input, config)
```

### 6.3 生产 Checklist

| 维度 | 建议 |
|------|------|
| 错误重试 | 在节点内实现 try/except，或使用 `retry_policy` |
| 超时控制 | 设置 `step_timeout` 防止单个节点卡死 |
| Token 预算 | 在 State 中跟踪 Token 消耗，超限终止 |
| 并发限制 | 使用异步 + 信号量控制并发数 |
| 检查点清理 | 定期清理过期的 thread_id |
| 沙箱执行 | 审计不可信代码时，使用 Docker 隔离 |

### 6.4 三篇文章选型对比

| 场景 | LangChain | LangGraph | DeepAgents |
|------|-----------|-----------|------------|
| 单文件审计 | ✅ 足够 | ❌ 过度 | ❌ 过度 |
| 多目录并行审计 | ❌ 不支持 | ✅ 原生支持 | ✅ 原生支持 |
| Supervisor 多 Agent | ❌ 不支持 | ✅ 原生支持 | ✅ 原生支持 |
| HITL 人工审批 | ❌ 不支持 | ✅ `interrupt_before` | ✅ `interrupt_on` |
| 状态持久化 | ❌ 手动 | ✅ 内置 | ✅ 内置 |
| 文件系统访问 | ❌ 手动 | ❌ 手动 | ✅ 预装 |
| 上下文压缩 | ❌ 手动 | ❌ 手动 | ✅ 预装 |
| 开箱即用 | ❌ 需组装 | ❌ 需组装 | ✅ 电池全装好 |

### 6.5 从 LangGraph 到 DeepAgents

如果你用 LangGraph 写审计 Agent，仍然需要自己实现：
- 文件系统访问（read_file、search_code）
- 上下文压缩（长对话自动摘要）
- 子 Agent 委派机制
- 持久记忆

**DeepAgents** 把这些全部预装好了——它是 LangGraph 之上的"电池全装好的底盘"：

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend

# DeepAgents = LangGraph + 预装能力
audit_agent = create_deep_agent(
    model="openai:gpt-4o",
    system_prompt="你是代码安全审计专家",
    backend=FilesystemBackend(root_dir="./src"),
    subagents=[searcher, auditor, reporter],  # 子 Agent 字典
    interrupt_on={"submit_report": True}       # HITL
)
```

[下一篇](/blog/2026/07/deepagents-quick-intro/)将介绍这个"电池全装好的 Agent 底盘"——用 DeepAgents 从零构建一个完整的代码审计系统。
