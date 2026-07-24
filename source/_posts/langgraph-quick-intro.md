---
title: LangGraph 快速入门
date: 2026-06-25 12:00:00
categories:
  - 技术
  - AI
tags:
  - Agent开发
  - LangGraph
  - LangChain
  - Python
  - 状态图
---

> 本文是 Agent 开发系列的第四篇。前序阅读：[Agent 概念入门](/blog/2026/06/agent-quick-intro/) → [纯 Python 从零实现 Agent](/blog/2026/06/agent-dev-quick-intro/) → [LangChain 快速入门](/blog/2026/06/langchain-quick-intro/)。下一篇将介绍 [DeepAgents 快速入门](/blog/2026/06/deepagents-code-audit/)——基于 LangGraph 的"电池全装好的 Agent 底盘"。

---

## 一、LangGraph 是什么

### 1.1 一句话定位

**LangGraph 是用"状态图"编排 Agent 的框架**——把 Agent Loop 表达为节点（Node）+ 边（Edge）+ 状态（State）的图结构。

### 1.2 为什么需要 LangGraph

上一篇文章讲的 LangChain Chain 是**线性**的：

```
Prompt → LLM → Parser
```

但真实 Agent 的场景是**非线性**的：
- ReAct 循环：LLM → 调用工具 → 结果返回 LLM → 再调用工具 → ... → 结束
- 条件分支：根据用户意图走不同处理路径
- 多 Agent 协作：Supervisor 把任务分派给不同专业 Agent

LangGraph 用**图论**解决这些问题：节点是计算单元，边是控制流，状态是共享数据。

### 1.3 与纯 Python ReAct 循环对比

| 维度 | 纯 Python ReAct | LangGraph |
|------|----------------|-----------|
| 循环控制 | `while True` + `if/else` | `StateGraph` + `add_conditional_edges` |
| 状态管理 | 手动维护 `messages` 列表 | `TypedDict` State 自动传递 |
| 可视化 | 无 | 内置图可视化 |
| 持久化 | 手动实现 | `MemorySaver` / `SqliteSaver` |
| 人在回路 | 手动 `input()` | `interrupt_before` / `interrupt_after` |

### 1.4 LangGraph 与 LangChain 的关系

```
LangChain（组件层）  →  LangGraph（编排层）  →  DeepAgents（电池全装好的底盘）
  ↓                       ↓
  ChatModel, Tool,         StateGraph, Node, Edge,
  Retriever, Chain         Checkpointing, Human-in-the-Loop
```

LangGraph **依赖** LangChain 的 Runnable 接口，但专注于**编排层**——Agent Loop、多 Agent 协作、状态持久化。

### 1.5 安装

```bash
pip install langgraph langchain-openai
```

当前版本：`langgraph` v0.4.x（2026 年 6 月）。

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
    messages: Annotated[list, add_messages]  # 消息列表，自动追加
    current_step: str  # 当前步骤
    result: str  # 最终结果
```

- `TypedDict`：类型化的字典，定义 Schema
- `Annotated[list, add_messages]`：使用 `add_messages` reducer，自动追加新消息（而非覆盖）
- 所有节点共享同一个 State 对象

### 2.2 Node：节点函数

```python
def agent_node(state: AgentState) -> dict:
    """Agent 节点：调用 LLM 决定下一步"""
    # 处理 state["messages"]
    response = llm.invoke(state["messages"])
    # 返回状态更新（部分更新，不是覆盖）
    return {"messages": [response], "current_step": "agent_called"}

def tool_node(state: AgentState) -> dict:
    """工具节点：执行工具调用"""
    last_message = state["messages"][-1]
    tool_result = execute_tool(last_message.tool_calls[0])
    return {"messages": [tool_result], "current_step": "tool_executed"}
```

### 2.3 Edge：三种边

```python
from langgraph.graph import StateGraph, START, END

# 1. 普通边：A 执行完一定到 B
graph.add_edge("node_a", "node_b")

# 2. 条件边：根据 router 函数决定下一步
def router(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"  # 走 tools 节点
    return "end"        # 走 END

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
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END

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

# 构建图
graph = StateGraph(RouterState)
graph.add_node("search", search_node)
graph.add_node("calculate", calculate_node)

graph.add_edge(START, "router")
graph.add_conditional_edges("router", router)  # router 返回的字符串直接作为节点名
graph.add_edge("search", END)
graph.add_edge("calculate", END)

app = graph.compile()

# 测试
result1 = app.invoke({"query": "123 * 456", "result": ""})
print(result1["result"])  # "计算 '123 * 456' = 56088"

result2 = app.invoke({"query": "Python 最新版本", "result": ""})
print(result2["result"])  # "搜索 'Python 最新版本' 的结果..."
```

---

## 三、用 LangGraph 构建 ReAct Agent

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

# 路由函数：判断是否需要调用工具
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

# 编译
app = graph.compile()

# 运行
result = app.invoke({
    "messages": [{"role": "user", "content": "计算 123*456，然后搜索 Python 3.13 的新特性"}]
})

for msg in result["messages"]:
    print(f"[{msg.type if hasattr(msg, 'type') else 'unknown'}] {msg.content[:50] if msg.content else '...'}...")
```

### 3.3 使用内置 create_react_agent

LangGraph 提供了更简洁的工厂函数：

```python
from langgraph.prebuilt import create_react_agent

# 一行创建 ReAct Agent
agent = create_react_agent(
    model=ChatOpenAI(model="gpt-4o"),
    tools=[search_web, calculate]
)

# 运行
result = agent.invoke({
    "messages": [{"role": "user", "content": "计算 123*456"}]
})
```

**手写 vs 工厂函数**：

| 场景 | 选择 |
|------|------|
| 快速原型、标准 ReAct | `create_react_agent()` |
| 自定义节点逻辑、复杂条件分支 | 手写 `StateGraph` |
| 需要完全控制 Agent Loop | 手写 |

### 3.4 流式输出

```python
# stream：逐步输出每个节点的执行
for event in app.stream(
    {"messages": [{"role": "user", "content": "计算 1+2+3"}]},
    stream_mode="updates"  # 只输出增量
):
    print(event)
    # {"agent": {"messages": [...]}}
    # {"tools": {"messages": [...]}}
    # {"agent": {"messages": [...]}}
```

---

## 四、高级编排模式

### 4.1 子图（Subgraph）

子图是一个完整的图，作为另一个图的节点：

```python
# 定义子图
sub_graph = StateGraph(SubState)
sub_graph.add_node("step1", step1_node)
sub_graph.add_node("step2", step2_node)
sub_graph.add_edge(START, "step1")
sub_graph.add_edge("step1", "step2")
sub_graph.add_edge("step2", END)
compiled_sub = sub_graph.compile()

# 作为主图的节点
main_graph = StateGraph(MainState)
main_graph.add_node("subtask", compiled_sub)  # 子图作为节点
main_graph.add_edge(START, "subtask")
main_graph.add_edge("subtask", END)
```

### 4.2 Multi-Agent 协作：Supervisor 模式

```python
from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, START, END, add_messages
from langchain_openai import ChatOpenAI

class TeamState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: str  # "search" | "calculate" | "end"

# Supervisor 节点：决定派谁干活
def supervisor_node(state: TeamState) -> dict:
    llm = ChatOpenAI(model="gpt-4o")
    response = llm.invoke([
        {"role": "system", "content": """你是团队主管。根据用户问题，决定让谁处理：
- 搜索问题 → 返回 "search"
- 计算问题 → 返回 "calculate"  
- 任务完成 → 返回 "end"
只返回一个词。"""},
        *state["messages"]
    ])
    decision = response.content.strip().lower()
    return {"next_agent": decision}

# 搜索 Agent
def search_agent(state: TeamState) -> dict:
    result = search_web.invoke({"query": state["messages"][-1].content})
    return {"messages": [{"role": "assistant", "content": f"搜索 Agent：{result}"}]}

# 计算 Agent
def calculate_agent(state: TeamState) -> dict:
    result = calculate.invoke({"expression": state["messages"][-1].content})
    return {"messages": [{"role": "assistant", "content": f"计算 Agent：结果是 {result}"}]}

# 路由
def route_supervisor(state: TeamState) -> str:
    return state["next_agent"]

# 构建图
graph = StateGraph(TeamState)
graph.add_node("supervisor", supervisor_node)
graph.add_node("search", search_agent)
graph.add_node("calculate", calculate_agent)

graph.add_edge(START, "supervisor")
graph.add_conditional_edges("supervisor", route_supervisor, {
    "search": "search",
    "calculate": "calculate",
    "end": END
})
graph.add_edge("search", "supervisor")      # 完成后回到 supervisor
graph.add_edge("calculate", "supervisor")

app = graph.compile()
```

### 4.3 Human-in-the-Loop（人在回路）

```python
from langgraph.checkpoint.memory import MemorySaver

# 编译时配置中断点
checkpointer = MemorySaver()

app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["sensitive_action"]  # 在执行 sensitive_action 前暂停
)

# 第一次运行：会在 sensitive_action 前暂停
config = {"configurable": {"thread_id": "user-123"}}
result = app.invoke(
    {"messages": [{"role": "user", "content": "删除重要文件"}]},
    config=config
)

# 此时 Agent 暂停，等待人工确认
# ... 用户检查后决定继续 ...

# 继续执行
result = app.invoke(None, config=config)  # 传入 None 表示继续
```

### 4.4 检查点（Checkpointing）

```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver

# 内存检查点（开发用）
memory = MemorySaver()

# SQLite 检查点（轻量持久化）
sqlite = SqliteSaver.from_conn_string("./checkpoints.db")

# PostgreSQL 检查点（生产级）
from langgraph.checkpoint.postgres import PostgresSaver
postgres = PostgresSaver.from_conn_string("postgresql://...")

# 使用
app = graph.compile(checkpointer=memory)
```

---

## 五、状态持久化与长任务

### 5.1 检查点详解

```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END

checkpointer = MemorySaver()
app = graph.compile(checkpointer=checkpointer)

# 每次调用传入 thread_id 隔离状态
config = {"configurable": {"thread_id": "conversation-1"}}

# 第一轮对话
app.invoke({"messages": [("user", "你好")]}, config=config)

# 第二轮对话（自动继承上一轮的 messages）
app.invoke({"messages": [("user", "继续我们的对话")]}, config=config)

# 另一个 thread_id，状态完全隔离
config2 = {"configurable": {"thread_id": "conversation-2"}}
app.invoke({"messages": [("user", "这是一个新对话")]}, config=config2)
```

### 5.2 时间旅行（Time Travel）

```python
# 获取所有历史检查点
history = list(app.get_state_history(config))

# 回溯到某个历史状态
past_state = history[2]  # 第 3 个历史状态

# 从历史状态继续执行
result = app.invoke(None, {"configurable": {
    "thread_id": "conversation-1",
    "checkpoint_id": past_state.config["configurable"]["checkpoint_id"]
}})
```

### 5.3 Streaming 三种模式

```python
# 模式 1：values - 每步输出完整状态
for event in app.stream(input, stream_mode="values"):
    print(event)  # {"messages": [...], "count": 1, ...}

# 模式 2：updates - 每步只输出增量
for event in app.stream(input, stream_mode="updates"):
    print(event)  # {"agent": {"messages": [新增的消息]}}

# 模式 3：messages - 逐 Token 流式输出 LLM 生成
for event in app.stream(input, stream_mode="messages"):
    print(event)  # (AIMessageChunk, metadata)
```

### 5.4 完整示例：人工审批 Agent

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END, add_messages
from langgraph.checkpoint.memory import MemorySaver

class ApprovalState(TypedDict):
    messages: Annotated[list, add_messages]
    request: str
    approved: bool

def submit_request(state: ApprovalState) -> dict:
    """提交申请"""
    return {"request": state["messages"][-1].content}

def wait_approval(state: ApprovalState) -> dict:
    """等待审批（人工介入点）"""
    # 这个节点会被 interrupt_before 中断
    return {}

def process_approved(state: ApprovalState) -> dict:
    """审批通过，执行操作"""
    return {"messages": [{"role": "assistant", "content": f"已批准：{state['request']}"}]}

def process_rejected(state: ApprovalState) -> dict:
    """审批拒绝"""
    return {"messages": [{"role": "assistant", "content": f"已拒绝：{state['request']}"}]}

def check_approval(state: ApprovalState) -> str:
    return "approved" if state.get("approved") else "rejected"

# 构建图
graph = StateGraph(ApprovalState)
graph.add_node("submit", submit_request)
graph.add_node("wait", wait_approval)
graph.add_node("approved", process_approved)
graph.add_node("rejected", process_rejected)

graph.add_edge(START, "submit")
graph.add_edge("submit", "wait")
graph.add_conditional_edges("wait", check_approval)
graph.add_edge("approved", END)
graph.add_edge("rejected", END)

# 编译，配置中断点
checkpointer = MemorySaver()
app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["wait"]  # 在 wait 节点前暂停
)

# 运行
config = {"configurable": {"thread_id": "approval-001"}}
app.invoke(
    {"messages": [{"role": "user", "content": "申请删除生产数据库"}], "approved": False},
    config=config
)
print("Agent 已暂停，等待审批...")

# 模拟人工审批：更新状态
app.update_state(config, {"approved": True})

# 继续执行
result = app.invoke(None, config=config)
print(result["messages"][-1].content)  # "已批准：申请删除生产数据库"
```

---

## 六、LangGraph Platform 与生产部署

### 6.1 LangGraph Platform

LangGraph Platform 是 LangGraph 的生产化部署方案，提供：

| 功能 | 说明 |
|------|------|
| REST API | 自动生成 `/threads`、`/runs`、`/stream` 等端点 |
| 持久化 | 内置 PostgreSQL 检查点存储 |
| 监控 | 与 LangSmith 集成，自动 Trace |
| 部署 | Docker / Kubernetes / LangGraph Cloud |

### 6.2 与 LangSmith 集成

设置环境变量后，LangGraph 自动上报每次节点执行的 Trace：

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY="your-key"
```

Trace 会展示：
- 每个节点的输入/输出
- 每个节点的耗时
- LLM 调用的 Token 消耗
- 工具调用的详情

### 6.3 生产 Checklist

| 维度 | 建议 |
|------|------|
| 错误重试 | 在节点内实现 try/except，或使用 `retry_policy` |
| 超时控制 | 设置 `step_timeout` 防止单个节点卡死 |
| Token 预算 | 在 State 中跟踪 Token 消耗，超限终止 |
| 并发限制 | 使用异步 + 信号量控制并发数 |
| 检查点清理 | 定期清理过期的 thread_id |
| 监控告警 | LangSmith 设置延迟/错误阈值告警 |

### 6.4 从 LangGraph 到 DeepAgents

如果你用 LangGraph 写 Agent，仍然需要自己实现：
- 文件系统访问
- 子 Agent 委派
- 上下文压缩
- 持久记忆

**DeepAgents** 把这些全部预装好了——它是 LangGraph 之上的"电池全装好的底盘"：

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend

# DeepAgents = LangGraph + 预装能力
agent = create_deep_agent(
    model="openai:gpt-4o",
    backend=FilesystemBackend(root_dir="./")
)
```

| 能力 | LangGraph | DeepAgents |
|------|-----------|------------|
| Agent Loop | 手写 StateGraph | 预装 |
| 文件系统 | 手动实现 | 预装 |
| 子 Agent | 手写子图 | 预装 |
| 上下文压缩 | 手动实现 | 预装 |
| 人在回路 | `interrupt_before` | 预装 |

---

> **下一篇**：[DeepAgents 快速入门](/blog/2026/06/deepagents-code-audit/) 将介绍这个"电池全装好的 Agent 底盘"——用 DeepAgents 从零构建一个代码审计 Agent。
