---
title: LangGraph 快速入门
date: 2026-07-01 10:00:00
categories:
  - 技术
  - AI
tags:
  - Agent开发
  - LangGraph
  - 代码审计
  - 状态图
---

> 本篇用 LangGraph 构建一个**多 Agent 代码审计系统**——Supervisor 调度 Searcher、Auditor、Reporter 三个专业 Agent 协同审计整个目录，支持人工审批严重漏洞。

---

## 一、为什么需要 LangGraph

### 1.1 LangChain Agent 的局限

LangChain 的单 Agent 执行流程：

```
用户 → Agent → 工具1 → Agent → 工具2 → Agent → ... → 结果
```

这在**单文件审计**中完全够用。但真实审计场景需要**多 Agent 协作**：
- 搜索 Agent 扫描整个目录，提取可疑代码
- 审计 Agent 对可疑代码进行漏洞检测
- 报告 Agent 汇总所有发现，生成审计报告
- 严重漏洞需要人工确认后才放行

LangChain 不负责这种复杂的多角色调度、分支和暂停恢复流程——这正是 LangGraph 的定位。

### 1.2 LangGraph 解决什么问题

LangGraph 用**状态图**解决这个问题：

```
LangGraph = 状态图编排框架
  State  → 所有 Agent 共享的数据
  Node   → Agent / 工具 / 普通函数
  Edge   → 调度逻辑（顺序 / 条件 / 循环）
```

### 1.3 LangGraph 与 LangChain 的关系

```
LangChain（组件层）  →  LangGraph（编排层）  →  DeepAgents（Agent 平台层）
  ↓                       ↓
  ChatModel, Tool,         StateGraph, Node, Edge,
  Retriever, LCEL          Checkpointing, Human-in-the-Loop
```

LangGraph **依赖** LangChain 的 Runnable 接口，但专注于**编排层**——Agent Loop、多 Agent 协作、状态持久化。LangGraph 不是 LangChain 的替代，而是互补——LangChain 解决"构建 Agent"，LangGraph 解决"编排 Agent"。


### 1.4 与纯 Python ReAct 循环的对比

| 维度 | 纯 Python ReAct | LangChain `create_agent` | LangGraph |
|------|----------------|------------------------|-----------|
| 循环控制 | `while True` + `if/else` | LangGraph 运行时自动 | `StateGraph` + `add_conditional_edges` |
| 状态管理 | 手动维护 messages | 自动 | `TypedDict` State 自动传递 |
| 复杂多 Agent 编排 | 需额外组合 | 原生适合（Supervisor/Handoff） |
| 可视化 | 无 | 无 | 内置图可视化 |
| 持久化 | 手动实现 | `checkpointer` 参数 | `MemorySaver` / `SqliteSaver` / `PostgresSaver` |
| 人在回路 | 手动 `input()` | 不支持 | `interrupt_before` / `interrupt_after` |

### 1.5 安装

```bash
pip install langgraph langchain-openai
# 可选：PostgreSQL 持久化
pip install langgraph-checkpoint-postgres
# 可选：预构建 Supervisor（见 4.1 节）
pip install langgraph-supervisor
```

---

## 二、LangGraph 核心概念

LangGraph 的四个核心概念：

| 概念 | 说明 | 类比 |
|------|------|------|
| **State** | 图中流动的数据，所有节点共享 | 函数参数 + 返回值 |
| **Reducer** | 控制 State 字段如何更新（追加 vs 覆盖） | 数组的 `push` vs 赋值 |
| **Node** | 计算单元，接收 State、返回 State 更新 | 函数（不限于 Agent） |
| **Edge** | 节点间的连接，决定执行顺序 | 控制流（if/else/循环） |

### 2.1 State：状态定义

```python
from typing import TypedDict, Annotated
from langgraph.graph import add_messages

class AgentState(TypedDict):
    """Agent 的状态定义——所有节点共享此状态"""
    messages: Annotated[list, add_messages]  # 消息列表，自动追加（而非覆盖）
    current_step: str  # 当前步骤（覆盖式更新）
```

### 2.2 Reducer：状态更新策略

`Annotated[list, add_messages]` 中的 `add_messages` 就是一个 **Reducer**——它决定了节点返回的字典如何合并到现有状态中。

```python
# 普通字段（无 Reducer）：覆盖式更新
# state["current_step"] = "auditing"  →  直接覆盖旧值

# Reducer 字段（add_messages）：追加式更新
# return {"messages": [response]}  →  response 追加到 messages 列表末尾
```

这解释了为什么节点返回 `{"messages": [response]}` 是追加而不是覆盖——因为 `add_messages` reducer 负责合并。

### 2.3 Node：节点（不限于 Agent）

> **重要**：Node 是 LangGraph 中最基本的执行单元。一个 Node 可以是 Agent，也可以是普通函数、工具调用、路由判断——任何接受 State、返回 State 更新的函数都可以作为 Node。

```python
def agent_node(state: AgentState) -> dict:
    """Agent 节点：调用 LLM 决定下一步"""
    response = llm.invoke(state["messages"])
    return {"messages": [response]}  # 通过 reducer 追加到列表

def simple_function_node(state: AgentState) -> dict:
    """普通函数节点：不涉及 LLM 调用"""
    return {"current_step": "processing_complete"}
```

### 2.4 Edge：三种边

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

### 2.5 StateGraph 生命周期

LangGraph 图的生命分为三个阶段：**构建 → 编译 → 运行**。

```python
# 1. 构建：定义 State、添加 Node 和 Edge
graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", router, {"tools": "tools", "end": END})
graph.add_edge("tools", "agent")

# 2. 编译：将图定义转为可执行的 Runnable 对象
app = graph.compile()
# compile() 之后才能调用 invoke/stream，才能接入 checkpointer、interrupt 等能力

# 3. 运行：执行图
result = app.invoke({"messages": [{"role": "user", "content": "你好"}]})
```

> `compile()` 是 LangGraph 的关键步骤——它将静态的图定义（Node + Edge）编译为可执行的 `CompiledGraph` 对象，后者实现了 LangChain 的 Runnable 接口，支持 `invoke`、`stream`、`batch` 等标准方法。

### 2.6 完整示例：最简两节点图

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

# 构建
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

---

## 三、用 LangGraph 实现 Agent Loop

Agent Loop 的核心模式：

```
LLM 推理 → 需要调用工具？
               ├── 是 → 执行 Tool → 将结果注入上下文 → 回到 LLM
               └── 否 → 生成最终回复 → 结束
```

LangGraph 将这个循环显式表达为状态图中的**条件边 + 回路**。

### 3.1 手写 Agent Loop

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END, add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import ToolMessage
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
        results.append(ToolMessage(content=tool_result, tool_call_id=tc["id"]))
    return {"messages": results}

# 路由函数：判断是否需要继续调用工具
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
graph.add_edge("tools", "agent")  # 工具执行后回到 agent（形成循环）

app = graph.compile()

# 运行
result = app.invoke({
    "messages": [{"role": "user", "content": "计算 123*456"}]
})
```

**对应的图结构**：

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

### 3.2 使用内置 create_react_agent

`langgraph.prebuilt.create_react_agent` 是 LangGraph 内置的工厂函数，适合需要直接拿到 `CompiledStateGraph` 进行二次扩展的场景。LangChain 1.0 主推的 `create_agent`（来自 `langchain.agents`）底层也是 LangGraph 运行时，两者不互斥但状态 schema 略有差异，不建议在同一 thread 上混用。

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
| 快速原型、标准 Agent Loop | `create_react_agent()` |
| 自定义节点逻辑、复杂条件分支 | 手写 `StateGraph` |
| 多 Agent 协作（Supervisor） | 手写 `StateGraph` |

### 3.3 流式输出

```python
# stream_mode="updates"：每步只输出增量（观察当前节点做了什么）
for event in app.stream(
    {"messages": [{"role": "user", "content": "计算 1+2+3"}]},
    stream_mode="updates"
):
    print(event)
    # {"agent": {"messages": [...]}}
    # {"tools": {"messages": [...]}}
```

---

## 四、多 Agent 系统设计

### 4.1 Supervisor 模式

Supervisor 是多 Agent 系统中最常见的编排模式——一个"总管"节点决定调度哪个专业 Agent。

Supervisor 有两种实现方式：

**规则路由（Rule-based）**：用 `if/else` 根据状态字段决定调度——稳定、可预测，适合流程固定的场景。

**LLM 路由**：用 LLM 判断该调度谁——灵活，适合复杂决策场景。

本文的审计流程固定（搜索 → 审计 → 报告），采用规则路由。

### 4.2 架构设计

```
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Supervisor  │ ←─── 决定调度谁（路由节点）
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

> **注意**：这里的 Supervisor 是一个**路由节点**（rule-based router），不是 Agent。Searcher、Auditor、Reporter 是各自专业领域的节点。在更复杂的场景中，每个节点可以是一个完整的 Agent（内含自己的 Tool Calling 循环）。

### 4.3 审计目标

审计整个 `src/` 目录，多 Agent 协同扫描，人工审批严重漏洞：

| 节点 | 角色 | 核心职责 |
|------|------|---------|
| **Supervisor** | 路由 | 根据审计进度决定调度哪个节点 |
| **Searcher** | 代码侦查员 | 扫描目标目录，提取可疑代码片段 |
| **Auditor** | 安全审计师 | 对可疑代码进行漏洞检测 |
| **Reporter** | 报告撰写员 | 汇总所有发现，生成审计报告 |

### 4.4 定义 State

```python
from typing import TypedDict, Annotated
from langgraph.graph import add_messages

class AuditState(TypedDict):
    """审计状态"""
    messages: Annotated[list, add_messages]  # 对话历史（reducer 追加）
    target_dir: str                          # 审计目标目录
    scan_results: list | None                  # None = 尚未扫描，[] = 扫描完成但无可疑文件
    findings: list | None                      # None = 尚未审计
    report: str | None                         # None = 尚未生成报告
    next_agent: str                          # Supervisor 决定调度的下一个节点
```

### 4.5 实现各节点

```python
from langchain_openai import ChatOpenAI
import os
import glob

# Searcher 节点：扫描代码库
def searcher_node(state: AuditState) -> dict:
    """搜索节点：扫描目标目录，提取可疑代码片段"""
    target_dir = state.get("target_dir", "./src")

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
    """审计节点：对可疑代码进行漏洞检测"""
    llm = ChatOpenAI(model="gpt-4o", temperature=0)

    # 注意：此处串行调用 LLM。生产环境中应改为 llm.batch() 或 asyncio.gather() 并行处理，
    # 避免文件过多时耗时线性增长。
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
    """报告节点：汇总所有发现，生成审计报告"""
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

# Supervisor 节点：规则路由（rule-based）
def supervisor_node(state: AuditState) -> dict:
    """Supervisor：根据当前状态决定下一步调度哪个节点（规则路由）"""
    if state.get("scan_results") is None:      # None = 尚未扫描
        next_agent = "searcher"
    elif state.get("findings") is None:        # None = 尚未审计
        next_agent = "auditor"
    elif state.get("report") is None:          # None = 尚未生成报告
        next_agent = "reporter"
    else:
        next_agent = "end"

    return {
        "next_agent": next_agent,
        "messages": [{"role": "assistant", "content": f"[Supervisor] 调度 {next_agent}"}]
    }
```

### 4.6 构建 Supervisor 图

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

### 4.7 运行审计

```python
result = audit_app.invoke({
    "target_dir": "./src/api",
    "scan_results": None,   # None = 尚未扫描
    "findings": None,       # None = 尚未审计
    "report": None,         # None = 尚未生成报告
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

### 4.8 审计报告示例

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

## 五、人机交互与持久化

### 5.1 检查点：保存执行状态

LangGraph 内置检查点机制，在每个节点执行后自动保存完整状态。

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

# 编译时传入 checkpointer
audit_app = graph.compile(checkpointer=sqlite)
```

### 5.2 中断：严重漏洞人工审批

当审计发现严重漏洞时，需要人工确认后才生成最终报告。中断依赖检查点——暂停时状态已保存，恢复时从检查点读取继续执行。

```python
checkpointer = MemorySaver()

audit_app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["reporter"]  # 在生成报告前暂停，等待人工审批
)

# 第一次运行：会在 reporter 节点前暂停
config = {"configurable": {"thread_id": "audit-2026-07-01"}}
result = audit_app.invoke(
    {"target_dir": "./src/api", "scan_results": None, "findings": None, "report": None, "messages": []},
    config=config
)

# 此时图暂停，等待人工确认
print("审计发现严重漏洞，等待人工审批...")
print(f"当前发现：{result['findings']}")

# 人工确认后，继续执行
result = audit_app.invoke(None, config=config)  # 传入 None 表示继续
print(result["report"])
```

### 5.3 恢复：长任务中断后继续

```python
# 审计中途断电或超时，从检查点恢复
config = {"configurable": {"thread_id": "audit-2026-07-01"}}

# 恢复执行（自动从上次中断的节点继续）
result = audit_app.invoke(None, config=config)
```

### 5.4 时间旅行：回溯到任意历史状态（高级）

> 时间旅行是高级特性，`get_state_history` 和 `checkpoint_id` 的具体获取方式可能随版本微调。

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

---

## 六、生产化实践

### 6.1 流式输出

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

### 6.2 LangSmith 可观测性

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
| 错误重试 | 在 `add_node()` 传入 `retry_policy` 参数，自动重试瞬态错误（伪码：`add_node("auditor", fn, retry_policy=RetryPolicy(max_attempts=3))`） |
| 超时控制 | 在 `add_node()` 传入 `timeout` 参数，防止单个节点卡死 |
| 循环上限 | 编译时设置 `max_loops=15`，防止 Agent 陷入无限循环 |
| Token 预算 | 在 State 中跟踪 Token 消耗，超限终止 |
| 并发限制 | 使用异步 + 信号量控制并发数 |
| 检查点清理 | 定期清理过期的 thread_id |
| 沙箱执行 | 审计不可信代码时，使用 Docker 隔离 |

### 6.4 选型对比

| 场景 | LangChain | LangGraph | DeepAgents |
|------|-----------|-----------|------------|
| 单文件审计 | ✅ 足够 | ❌ 过度 | ❌ 过度 |
| 多目录协同审计 | ❌ 不支持 | ✅ 原生支持 | ✅ 原生支持 |
| Supervisor 多 Agent | ❌ 不支持 | ✅ 原生支持 | ✅ 原生支持 |
| HITL 人工审批 | ❌ 不支持 | ✅ `interrupt_before` | ✅ `interrupt_on` |
| 状态持久化 | ❌ 手动 | ✅ 内置 | ✅ 内置 |
| 文件系统访问 | ❌ 手动 | ❌ 手动 | ✅ 预装 |
| 上下文压缩 | ❌ 手动 | ❌ 手动 | ✅ 预装 |
| 开箱即用 | ❌ 需组装 | ❌ 需组装 | ✅ 开箱即用 |

### 6.5 从 LangGraph 到 DeepAgents

如果你用 LangGraph 写审计 Agent，仍然需要自己实现：
- 文件系统访问（read_file、search_code）
- 上下文压缩（长对话自动摘要）
- 子 Agent 委派机制
- 持久记忆

**DeepAgents** 把这些全部预装好了——它是 LangGraph 之上的 Agent 平台层。DeepAgents 直接构建在 LangGraph 之上（而非 LangChain），正是因为自主 Agent 需要 LangGraph 提供的状态管理、检查点和人工介入能力。

三篇文章的定位：

- LangChain → 解决"Agent 的组件和接口"（LLM、Tool、Prompt、Parser 等标准零件）-> 如何构建一个 Agent
- LangGraph → 解决"Agent 的工作流编排"（状态图、循环、分支、持久化、HITL）-> 如何编排一或多个 Agent
- DeepAgents → 解决"Agent 的预装能力平台"（文件系统、子 Agent、记忆、规划，开箱即用）-> 如何运行自主 Agent

Agent 的演进过程是这样的：

```
阶段 1：调用模型        阶段 2：单 Agent          阶段 3：Agent 工作流      阶段 4：自主 Agent

User                    User                    Supervisor               DeepAgents
  |                       |                       |                     ┌──────────┐
  LLM                     Agent                   ├── Searcher           │ Planning │
                                                  ├── Auditor            │ Memory   │
                                                  └── Reporter           │ SubAgent │
                                                                        └──────────┘
LangChain 覆盖阶段 1-2，LangGraph 覆盖阶段 3，DeepAgents 覆盖阶段 4。
```

> DeepAgents 目前处于快速迭代期，以下 API 仅为示意，具体以[官方文档](https://docs.langchain.com/oss/python/deepagents/overview/)为准。

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

> **生产提示**：如果 Supervisor 逻辑较标准，也可以直接使用 `langgraph-supervisor` 的 `create_supervisor()` 预构建函数，省去手写路由节点。
