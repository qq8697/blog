---
title: DeepAgents 快速入门
date: 2026-07-02 10:00:00
categories:
  - 技术
  - AI
tags:
  - Agent开发
  - DeepAgents
  - 代码审计
  - MCP
  - Skills
---


在 LangChain 篇中，我们用 `create_agent` 构建了单文件审计 Agent——但 `read_file` 工具需要手动注册，上下文长了需要手动压缩。
在 LangGraph 篇中，我们用 `StateGraph` 编排了多 Agent 审计系统——但文件系统、子 Agent 生命周期、上下文管理仍需自己实现。

**DeepAgents** 把这些全部预装好了——如何构建能够自主规划、调用工具、管理上下文、委派子任务并持续执行复杂任务的 Agent 系统。

这篇文章用 DeepAgents 带你从零构建一个**代码审计 Agent**——自动发现 SQL 注入、越权漏洞、硬编码凭据，生成专业审计报告，严重漏洞人工确认后才放行。

---

## 一、DeepAgents 是什么

**DeepAgents** 是 LangChain 生态推出的"电池全装好的 Agent 底盘"（batteries-included agent harness）。

它在 LangChain 生态中的位置：

![LangChain 生态示意图](/images/Gemini_Generated_Image_ao4zb3ao4zb3ao4z.png)

### 1.1 Agent Harness：DeepAgents 的核心思想

传统 Agent 开发，你需要自己组装每个零件：

```
LLM → Tool → Prompt → Loop → 上下文管理 → 文件系统 → ...
```

Agent Harness 把这些全部封装为一个预装好的运行框架：

```
          DeepAgent（Agent Harness）
    ┌─────────────────────────────────┐
    │  Planning    Filesystem    HITL │
    │  SubAgent    Memory    Context  │
    │  Middleware  Shell     Skills   │
    └─────────────────────────────────┘
              ↓ 调用
            Tools
              ↓ 运行
         LangGraph Runtime
              ↓ 基础
           LangChain
```

你只需要关注业务逻辑——文件系统、子 Agent、上下文压缩、持久记忆全部预装好了。

### 1.2 LangGraph 之后还有哪些问题

即使使用 LangGraph，开发者仍然需要自己实现很多能力：

| 能力 | LangGraph | DeepAgents |
|------|-----------|------------|
| 状态管理 | 需要定义 State | 内置管理 |
| 任务拆解 | 需要设计节点 | 内置 Planning |
| 文件读写 | 自己实现 Tool | 内置 Filesystem |
| 上下文压缩 | 自己处理 | 内置 Middleware |
| 子 Agent 生命周期 | 自己设计 | 内置 |
| 长期任务恢复 | 需要组合多个能力 | 内置支持 |

> DeepAgents 基于 LangGraph 构建，为 LangGraph 提供了一套面向长任务 Agent 的高级抽象。

### 1.3 与其他方案比较

| 方案 | 定位 | 什么时候用 |
|------|------|-----------|
| 纯 Python 手写 | 完全掌控每个细节 | 学习 Agent 原理、极致定制 |
| DeepAgents | 开箱即用的完整 Harness | 快速落地、生产级、不想重复造轮子 |
| Dify / Coze | 可视化配置平台 | 非开发者参与、快速原型 |

---

## 二、5 分钟跑通第一个 Agent

### 2.1 安装

```bash
pip install deepagents
```

### 2.2 让 Agent 审计本地代码

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend

agent = create_deep_agent(
    model="openai:gpt-4o",
    system_prompt="你是一个代码安全审计专家。",
    backend=FilesystemBackend(root_dir="./src"),  # 挂载文件系统
)

# 让 Agent 读取本地文件并审计
result = agent.invoke({
    "messages": [{"role": "user", "content": "审计 ./src/api/auth.py 的安全性"}]
})
# 当你发送审计请求后，Agent 会自主决定调用 read_file 读取目标文件，然后分析安全问题
print(result["messages"][-1].content)
```

**输出**：

```
⚠️ 发现 SQL 注入风险

文件：src/api/auth.py:47
query = f"SELECT * FROM users WHERE name='{user_input}'"
攻击者可输入 `' OR '1'='1` 绕过认证。

修复方案：使用参数化查询
cursor.execute("SELECT * FROM users WHERE name=?", (user_input,))
```

### 2.3 发生了什么

`create_deep_agent()` 一行代码背后，DeepAgents 自动通过内置 Middleware 帮你做了：

1. 创建了 Agent Loop（ReAct 循环）
2. 挂载了文件系统（Agent 可以读写文件）
3. 配置了上下文管理（对话长了自动压缩）
4. 启用了规划能力（复杂任务自动拆解）

这些都是可以按需关闭或替换的——但默认就给你了。

## 三、核心能力逐一上手

### 3.1 Middleware：DeepAgents 运行机制

DeepAgents 的核心是一套 Middleware 栈，每个 Middleware 负责一项能力，按固定顺序执行。默认中间件执行顺序：

| 顺序 | 中间件 | 能力 |
|------|--------|------|
| 1 | TodoListMiddleware | 任务规划与跟踪 |
| 2 | SkillsMiddleware | 技能加载（SKILL.md） |
| 3 | FilesystemMiddleware | 文件系统（`read_file`, `write_file`, `edit_file`, `grep` 等） |
| 4 | SubAgentMiddleware | 子 Agent 委派（`task` 工具） |
| 5 | SummarizationMiddleware | 上下文压缩 |
| 6 | PatchToolCallsMiddleware | 工具调用修复（中断后恢复） |
| 7 | HumanInTheLoopMiddleware | 人工介入（`interrupt_on`） |

开发者可以通过 `middleware` 参数追加自定义 Middleware，或通过 `excluded_middleware` 禁用部分默认项。

长对话是 Agent 的"记忆杀手"。DeepAgents 通过内置 Middleware 自动处理：当工具输出超过 20,000 tokens 时自动卸载到文件系统，当上下文超过窗口 85% 时自动压缩。你不需要自己写压缩逻辑。

### 3.2 Planning：复杂任务管理

DeepAgents 内置任务规划能力，帮助 Agent 创建和维护任务清单，用于复杂任务的执行跟踪。这不是简单的 LLM 推理——而是有结构化的 Todo 列表来跟踪进度。

### 3.3 Filesystem：Agent 操作世界

DeepAgents 通过 `FilesystemBackend` 挂载文件系统，Agent 可以像人一样读文件、写文件、搜索代码：

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend

agent = create_deep_agent(
    system_prompt="你是代码审计专家。",
    backend=FilesystemBackend(root_dir="./src"),  # 本地文件系统
)
```

Agent 会自动调用 `read_file`、`search_code` 等工具，你不需要手动注册。

> ⚠️ **安全警告**：`FilesystemBackend` 直接访问真实磁盘，Agent 可以读写 `root_dir` 下的任意文件。生产环境（尤其是 Web 服务）应使用沙箱后端或权限控制，防止路径穿越攻击。
>
> DeepAgents 提供多种后端：`StateBackend`（内存隔离，适合快速原型）、`FilesystemBackend`（直接磁盘访问，适合本地 CLI）、`StoreBackend`（持久化，适合生产记忆）、沙箱后端（如 `LangSmithSandbox`，适合 Web 服务）。

### 3.4 SubAgent：任务分解与委派

DeepAgents 支持通过配置方式定义子 Agent，通常包括 `name`、`description`、`system_prompt`、`tools` 等字段：

```python
# 子 Agent 配置示例（具体 API 以官方文档为准）
# 子 Agent 默认继承主 Agent 的所有内置工具，这里只传入额外的自定义工具（如有）
searcher = {
    "name": "searcher",
    "description": "代码搜索专家。扫描目标代码库，提取可疑代码片段。",
    "system_prompt": "你是代码侦查专家。",
    "tools": [],  # 内置工具（read_file 等）自动继承，无需显式传入
}

# 创建主 Agent，传入子 Agent 列表
main_agent = create_deep_agent(
    model="openai:gpt-4o",
    system_prompt="你是审计任务总调度。根据子 Agent 的 description 自主决定调用哪个。",
    subagents=[searcher],
    backend=FilesystemBackend(root_dir="./src"),
)
```

**为什么用子 Agent 而不是一个 Agent 干所有事？**

| 单 Agent | 多 Agent |
|---------|----------|
| 上下文窗口被所有任务共享 | 每个子 Agent 有独立上下文 |
| 一个任务出错，整个对话可能跑偏 | 失败隔离，一个子 Agent 崩溃不影响其他 |
| 串行执行 | 可并行执行 |

### 3.5 Skills：知识能力扩展

Skills 是"告诉 Agent 怎么做事情"的可复用知识模块——**Tool 是"做事情"，Skill 是"知道怎么做"**。在 DeepAgents 中，Skills 存放在 `skills/` 目录下，每个 Skill 是一个文件夹，内含 `SKILL.md`。创建 Agent 时通过 `skills` 参数注入：

```python
agent = create_deep_agent(
    system_prompt="你是代码安全审计专家。",
    skills=["./skills/owasp-top10"],  # 注入 Skills 目录
)
```

**SKILL.md 示例**：

```markdown
# Skill: OWASP Top 10 安全审计

## 触发条件
当用户请求代码安全审计时自动激活。

## 审计清单

### A01: 访问控制失效
- 检查每个 API 端点是否有权限校验
- 检查是否存在直接对象引用（IDOR）

### A03: 注入
- SQL 注入：是否使用参数化查询
- 命令注入：是否使用 shell=True

## 输出格式
[等级] [CWE-XXX] 漏洞名称
文件：路径:行号
风险：攻击场景
修复：修复代码
```

### 3.6 MCP：外部工具接入

DeepAgents 通过 LangChain 的 MCP 适配器接入 MCP Server——MCP 解决"工具连接"问题，DeepAgents 负责"工具调用和任务执行"：

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from deepagents import create_deep_agent

# 创建 MCP 客户端
client = MultiServerMCPClient({
    "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
    }
})
tools = await client.get_tools()

# 将 MCP 工具注入 Agent
agent = create_deep_agent(tools=tools)
```

### 3.7 HITL：人工控制

关键操作不能让 Agent 自己决定。DeepAgents 通过 `interrupt_on` 参数配置审批：

```python
from langgraph.checkpoint.memory import MemorySaver

agent = create_deep_agent(
    model="openai:gpt-4o",
    interrupt_on={
        "write_file": True,      # 写文件前需要审批
        "submit_report": True,   # 提交报告前需要审批
    },
    checkpointer=MemorySaver(),  # interrupt_on 必须配合 checkpointer 才能暂停和恢复
)

# 运行时会自动暂停，等待人工确认
```

人工审批后恢复执行：

```python
from langgraph.types import Command

# 恢复执行（config 包含 thread_id 用于匹配暂停点）
result = agent.invoke(Command(resume=True), config=config)
```

---

## 四、实战：构建一个代码审计 Agent

### 4.1 场景与架构

用 DeepAgents 构建一个多子 Agent 协作的代码安全审计系统，覆盖 OWASP Top 10 常见漏洞。采用 DeepAgents 自主任务分解模式——主 Agent 根据任务自主调度子 Agent：

![Supervisor 编排模式](/images/Gemini_Generated_Image_cn5x69cn5x69cn5x.png)

**各子 Agent 职责**：

| Agent | 角色 | 核心工具 |
|-------|------|---------|
| **Searcher** | 代码侦查员——扫描目标代码库，提取可疑代码片段 | 内置 `read_file` + 自定义 `search_code` |
| **SecurityAuditor** | 安全审计师——对提取的代码进行安全漏洞检测 | `check_sql_injection`, `check_xss`（上文已定义） |
| **ComplianceChecker** | 合规检查员——按合规标准逐项检查 | 自定义工具（需自己实现） |
| **ReportGenerator** | 报告撰写员——汇总所有发现，生成结构化报告 | 自定义工具（需自己实现） |

> **注意**：上述工具（如 `check_sql_injection`）是自定义工具，需要自己实现。你也可以用 MCP 适配器接入现成的安全扫描工具。

**三种编排模式**：

| 模式 | 说明 | 审计场景应用 |
|------|------|-------------|
| **Classify and Act** | 先分类，再分配专门子 Agent | 判断漏洞类型后分配给对应专家 |
| **Fanout and Synthesize** | 并行处理，汇总结果 | 对每个文件并行启动审计子 Agent |
| **Adversarial Verification** | 双盲验证，减少误报 | 两个 Agent 独立审计，一致才报告 |

### 4.2 代码实现

**先定义子 Agent，再创建主 Agent**（示例基于 DeepAgents 当前版本 API，实际使用请以官方文档为准）

> **安全免责声明**：本文示例中的 `FilesystemBackend` 直接访问真实文件系统，生产环境应使用沙箱后端或权限控制。自定义审计工具（如 `check_sql_injection`）的正则仅用于演示，生产环境建议使用 Semgrep、Bandit、CodeQL 等专业静态分析工具。

**定义结构化输出模型**（与 LangChain 篇对齐）：

```python
from pydantic import BaseModel, Field

class AuditFinding(BaseModel):
    """单条审计发现"""
    vulnerability: str = Field(description="漏洞名称")
    cwe_id: str = Field(description="CWE 编号")
    severity: str = Field(description="严重等级：严重/高危/中危/低危")
    location: str = Field(description="文件:行号")
    fix: str = Field(description="修复代码")

class AuditReport(BaseModel):
    """完整审计报告"""
    file: str = Field(description="审计文件路径")
    findings: list[AuditFinding] = Field(description="所有发现")
    summary: str = Field(description="审计摘要")
```

**定义自定义工具**（简化示例，生产环境用专业工具）：

```python
from langchain_core.tools import tool

@tool
def check_sql_injection(code: str) -> str:
    """检测 SQL 注入——检查是否存在字符串拼接 SQL 的模式"""
    import re
    if re.search(r"['\"].*SELECT.*\{", code, re.IGNORECASE):
        return "发现 SQL 注入风险：字符串拼接 SQL 查询"
    return "未发现风险"

@tool
def check_xss(code: str) -> str:
    """检测 XSS 漏洞"""
    return "未发现 XSS 风险"
```

**配置子 Agent**：

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langgraph.checkpoint.memory import MemorySaver

# 1. 定义子 Agent（内置工具自动继承，这里只传入自定义工具）
searcher = {
    "name": "searcher",
    "description": "代码搜索与上下文提取专家。扫描目标代码库，提取可疑代码片段及上下文。",
    "system_prompt": "你是代码侦查专家。扫描目标代码库，提取所有可能存在安全风险的代码片段。",
    "tools": [],  # read_file 等内置工具自动继承
}

security_auditor = {
    "name": "security_auditor",
    "description": "安全漏洞检测专家。对代码片段进行深度安全分析，覆盖 OWASP Top 10。",
    "system_prompt": """你是资深安全审计师。对每个可疑代码片段进行深度安全分析。
对每个发现，必须给出：漏洞名称和 CWE 编号、风险等级、攻击场景、修复代码。""",
    "tools": [check_sql_injection, check_xss],  # 自定义安全检测工具（上文已定义）
}

compliance_checker = {
    "name": "compliance_checker",
    "description": "合规检查专家。按等保 2.0/GDPR/SOC2 标准检查代码。",
    "system_prompt": "你是合规检查专家，精通等保 2.0、GDPR、SOC2 等标准。",
    "tools": [],  # 自定义工具需在此定义（参见 LangChain 篇 4.2 节）
}

report_generator = {
    "name": "report_generator",
    "description": "报告撰写专家。汇总所有审计发现，生成结构化审计报告。",
    "system_prompt": "你是安全审计报告撰写专家。按风险等级排序，生成完整审计报告。",
    "tools": [],  # 自定义工具需在此定义（参见 LangChain 篇 4.2 节）
}

# 2. 创建主 Agent（子 Agent 必须先定义）
audit_agent = create_deep_agent(
    model="openai:gpt-4o",
    system_prompt="""你是代码安全审计任务的总调度专家。
根据子 Agent 的 description 自主决定调用哪个子 Agent 完成审计任务。
严重和高危漏洞需要触发 HITL 审批流程。
""",
    backend=FilesystemBackend(root_dir="./src"),
    subagents=[searcher, security_auditor, compliance_checker, report_generator],
    skills=["./skills/owasp-top10"],
    interrupt_on={
        "submit_report": True,  # 提交审计报告前需要审批
    },
    checkpointer=MemorySaver(),
    # response_format=AuditReport,  # 伪码：结构化审计报告，具体 API 以官方文档为准
)
```

**运行审计**

```python
result = audit_agent.invoke({
    "messages": [{
        "role": "user",
        "content": "审计 src/api 目录下所有代码，按等保 2.0 标准，生成完整审计报告"
    }],
})

print(result["messages"][-1].content)
```

**运行日志示例**：

```
[Main Agent] 任务拆解完成，委派 Searcher 开始扫描...
[Searcher] 发现 247 个文件，提取 83 个可疑代码片段
[Main Agent] 委派 SecurityAuditor 和 ComplianceChecker 并行分析...
[SecurityAuditor] 发现 12 个漏洞：严重 3 / 高危 5 / 中危 3 / 低危 1
[ComplianceChecker] 合规检查：2 项不合规

[HITL] 检测到严重漏洞，提交审计报告前等待审批...
[用户] APPROVE

[ReportGenerator] 生成最终报告...
审计完成。共发现 12 个漏洞，2 项不合规。
```

### 4.3 审计报告示例

Agent 生成的完整审计报告格式：

`````markdown
# 代码安全审计报告

项目：ShopX 电商平台 | 日期：2026-07-02 | 范围：src/api/ (247 文件)

## 审计摘要

| 严重等级 | 数量 |
|---------|------|
| 严重 | 3 |
| 高危 | 5 |
| 中危 | 3 |
| 低危 | 1 |

## 严重漏洞

### [严重] CWE-89 SQL 注入 - `src/api/auth.py:47`
**代码**：
```python
query = f"SELECT * FROM users WHERE username='{username}'"
```
**攻击场景**：攻击者输入 `' OR '1'='1` 可绕过认证，获取所有用户数据。
**修复**：
```python
cursor.execute("SELECT * FROM users WHERE username=?", (username,))
```

### [严重] CWE-284 水平越权 - `src/api/order.py:112`
**代码**：
```python
return Order.query.get(order_id)
```
**攻击场景**：修改 URL 中的 `order_id` 参数可访问其他用户的订单。
**修复**：
```python
if order.user_id != current_user.id:
    raise PermissionDenied
return order
```

### [严重] CWE-798 硬编码凭据 - `src/config/database.py:12`
**代码**：
```python
DATABASE_URL = "mysql://admin:MyP@ssw0rd123@localhost:3306/shopx"
```
**攻击场景**：凭据泄露后数据库被完全控制。
**修复**：
```python
DATABASE_URL = os.getenv("DATABASE_URL")
```

## 风险统计

严重 3 个（24h 内修复）| 高危 5 个（本次迭代）| 中危 3 个（下一迭代）| 低危 1 个（跟踪）
`````

---

## 五、生产部署

### 生产 Agent 三原则

| 原则 | 对应能力 | 实现方式 |
|------|---------|----------|
| **可观察** | 追踪每次调用、每个 Token 消耗 | LangSmith |
| **可恢复** | 中断后从检查点恢复 | Checkpoint |
| **可控制** | 关键操作人工确认、权限隔离 | HITL / 权限控制 |

### 5.1 流式输出

DeepAgents 底层基于 LangGraph 运行时，因此完全继承其流式能力——`stream(stream_mode="values")`、`stream(stream_mode="updates")`、`stream(stream_mode="messages")` 三种模式与 LangGraph 用法一致，详见 LangGraph 篇 6.1 节。

与 LangGraph 不同的是，DeepAgents 的流式输出还能观察到**子 Agent 级别的执行状态**——你可以实时看到 `Searcher` 完成了扫描、`SecurityAuditor` 正在分析第 3 个文件，而不仅仅是节点级别的状态更新。

### 5.2 与 LangSmith 集成

DeepAgents 天然集成了 LangSmith，用于追踪、评估和监控：

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-langsmith-api-key"

agent = create_deep_agent(model="openai:gpt-4o")
```

LangSmith 能帮你看到：每次审计的完整调用链、每个子 Agent 的 Token 消耗、漏洞发现的准确率和召回率、审计耗时分布。

### 5.3 生产部署

DeepAgents 的生产部署可通过托管运行时（Managed Deep Agents，目前 private beta）实现，支持持久化执行、HITL 暂停和多租户隔离：

| 能力 | 说明 |
|------|------|
| 持久化执行 | Agent 运行中断后可从检查点恢复 |
| HITL 暂停 | 可等待人工审批数小时甚至数天 |
| 多租户 | 不同用户的 Agent 会话隔离 |
| 定时任务 | 支持 cron 调度 |

### 5.4 安全与权限控制

DeepAgents 支持通过权限配置限制 Agent 的文件系统操作（伪码，具体 API 以官方文档为准）：

```python
# 示例：只允许读取 /workspace 目录，禁止写入
agent = create_deep_agent(
    model="openai:gpt-4o",
    permissions=[
        {"operations": ["read"], "paths": ["/workspace/**"], "mode": "allow"},
        {"operations": ["write"], "paths": ["/**"], "mode": "deny"},
    ],
)
```

### 5.5 成本控制

成本控制需在调用层实现，而非 DeepAgents 内置参数：

```python
class CostTracker:
    def __init__(self, budget=10.0):
        self.budget = budget
        self.spent = 0.0

    def track(self, response):
        usage = response.get("usage", {})
        cost = (usage.get("input_tokens", 0) * 0.0025 +
                usage.get("output_tokens", 0) * 0.01) / 1000
        self.spent += cost
        if self.spent > self.budget * 0.8:
            print(f"⚠️ 预算警告：{self.spent:.2f}/{self.budget:.2f}")
```

### 5.6 生产 Checklist

| 维度 | 建议 |
|------|------|
| 权限控制 | 使用沙箱后端或 `permissions` 限制文件操作范围 |
| HITL 配置 | 对 `write_file`、`submit_report` 等关键操作启用审批 |
| 成本追踪 | 通过 LangSmith 监控每个子 Agent 的 Token 消耗 |
| 检查点 | 传入 `checkpointer` 启用持久化，支持中断恢复 |
| 并发限制 | 子 Agent 并行时控制并发数，避免 API 限流 |
| 工具安全 | 自定义审计工具限制正则复杂度，防止 ReDoS |

---

## 六、选型建议

| 场景 | 推荐方案 | 为什么 |
|------|---------|--------|
| 学习 Agent 原理 | 纯 Python 手写 | 理解每一行代码在做什么 |
| 快速落地代码审计 | **DeepAgents** | 文件系统、子 Agent、HITL 全部内置 |
| 需要极致定制 | 纯 Python / LangGraph | 完全控制每个细节 |
| 非开发者参与审计 | Dify / Coze 平台 | 可视化配置，无需编程 |
| 已有 LangGraph 工作流，想加文件系统 | **DeepAgents** | 无需重写，直接挂载 backend |
| 需要 Agent 自主规划多步任务 | **DeepAgents** | 内置 Planning 与 TodoListMiddleware |
| 需要长时间运行 + 中断恢复 | **DeepAgents + Managed Deep Agents** | 持久化 + HITL 原生支持 |
| 企业级合规审计 | **DeepAgents + LangSmith** | 可追溯、可评估、可审计 |

> **小结**：
>
> - **LangChain** 解决"Agent 的组件和接口"——如何构建一个 Agent
> - **LangGraph** 解决"Agent 的工作流编排"——如何编排一或多个 Agent
> - **DeepAgents** 解决"Agent 的预装能力平台"——如何运行自主 Agent
>
> DeepAgents 把 Agent 开发中最繁琐的部分——文件系统、子 Agent 委派、上下文管理、HITL——全部通过内置 Middleware 预装好了。你用几十行代码就能搭建一个专业级的代码安全审计系统，而不用从零写几百行基础设施代码。
