---
title: DeepAgents 快速入门
date: 2026-06-30 10:00:00
categories:
  - 技术
  - AI
tags:
  - Agent
  - Agent开发
  - DeepAgents
  - 代码审计
  - MCP
  - Skills
---

2026 年，Agent 开发已经不需要从零手写 Agent Loop、上下文压缩、子 Agent 委派了。LangChain 团队推出的 **DeepAgents** 把这些全部预装好了——拿来就能跑，跑起来就能用。

这篇文章用 DeepAgents 带你从零构建一个**代码审计 Agent**——自动发现 SQL 注入、越权漏洞、硬编码凭据，生成专业审计报告，严重漏洞人工确认后才放行。

---

## 一、DeepAgents 是什么

**DeepAgents** 是 LangChain 团队推出的"电池全装好的 Agent 底盘"（batteries-included agent harness）。

它在 LangChain 生态中的位置：

```
LangGraph（底层运行时：图执行、流式、持久化、检查点）
    ↓
LangChain create_agent（轻量 Harness：最小 Agent 循环）
    ↓
DeepAgents（完整 Harness：规划 + 文件 + 子Agent + 记忆 + 技能）
```

**一句话定位**：如果你用纯 Python 写 Agent，需要自己实现文件系统、子 Agent、上下文压缩、持久记忆——DeepAgents 把这些全部预装好了，你只需要关注业务逻辑。

**核心特性**：

| 特性 | 说明 |
|------|------|
| 子 Agent 委派 | 主 Agent 通过 `task` 工具委派任务给子 Agent，每个有独立上下文窗口 |
| 文件系统 | 可插拔的本地/沙箱/远程存储，Agent 能读、写、搜索文件 |
| 上下文管理 | 内置 Middleware 自动压缩长对话，工具输出可卸载到磁盘 |
| Shell 访问 | 在沙箱中执行命令 |
| 持久记忆 | 跨会话的状态和存储后端 |
| 人工介入（HITL） | 通过 `interrupt_on` 参数配置工具调用审批 |
| Skills | 通过 `skills` 参数按需加载可复用行为 |
| 工具/MCP | 自带函数 + 通过 MCP 适配器接入任意 MCP Server |

**2026 年最新特性**（v0.5.0，2026年4月）：

| 特性 | 说明 |
|------|------|
| 异步子 Agent | 非阻塞后台任务，多个子 Agent 可并行工作 |
| 动态子 Agent | Agent 可编写脚本批量驱动子 Agent |
| 多模态文件 | `read_file` 支持 PDF、音频、视频等格式 |

**DeepAgents vs 其他方案**：

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
# Agent 会自动调用 read_file 读取文件，然后分析安全问题
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

---

## 三、核心特性逐一上手

### 3.1 子 Agent 委派

DeepAgents 内置了子 Agent 机制——主 Agent 通过 `task` 工具把复杂子任务委派给专门的子 Agent。子 Agent 需要**定义为字典**传入：

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend

# 子 Agent 定义为字典
searcher = {
    "name": "searcher",
    "description": "代码搜索与上下文提取专家。负责扫描目标代码库，提取可疑代码片段。",
    "system_prompt": "你是代码侦查专家。扫描代码库，提取所有可能存在安全风险的代码片段。",
    "tools": [search_code, read_file, list_dependencies],  # 工具对象，非字符串
}

auditor = {
    "name": "security_auditor",
    "description": "安全漏洞检测专家。对代码片段进行深度安全分析。",
    "system_prompt": "你是资深安全审计师。对每个可疑代码片段进行安全漏洞检测，覆盖 OWASP Top 10。",
    "tools": [check_sql_injection, check_xss, check_auth],
}

# 创建主 Agent，传入子 Agent 列表
main_agent = create_deep_agent(
    model="openai:gpt-4o",
    system_prompt="你是审计任务总调度。根据子 Agent 的 description 自主决定调用哪个。",
    subagents=[searcher, auditor],
    backend=FilesystemBackend(root_dir="./src"),
)

result = main_agent.invoke({
    "messages": [{"role": "user", "content": "审计 src/api/ 的安全性"}]
})
```

**为什么用子 Agent 而不是一个 Agent 干所有事？**

| 单 Agent | 多 Agent |
|---------|---------|
| 上下文窗口被所有任务共享 | 每个子 Agent 有独立上下文 |
| 一个任务出错，整个对话可能跑偏 | 失败隔离，一个子 Agent 崩溃不影响其他 |
| 串行执行 | 可并行执行 |

**子 Agent vs Skills 选择指南**：

| 场景 | 用 Subagent | 用 Skills |
|------|------------|----------|
| 需要上下文隔离 | ✅ | ❌ |
| 需要专门的工具集 | ✅ | ❌ |
| 复用流程/指令 | ✅ | ✅ |
| 跨 Agent 共享能力 | ❌ | ✅ |
| 避免 Token 膨胀 | ✅ | ✅ |

> 两者不是二选一——**子 Agent 也可以使用 Skills** 来管理自己的上下文。

### 3.2 文件系统

DeepAgents 通过 `FilesystemBackend` 挂载文件系统，Agent 可以像人一样读文件、写文件、搜索代码：

```python
from deepagents.backends import FilesystemBackend

agent = create_deep_agent(
    system_prompt="你是代码审计专家。",
    backend=FilesystemBackend(root_dir="./src"),  # 本地文件系统
)
```

Agent 会自动调用 `read_file`、`search_code` 等工具，你不需要手动注册。

### 3.3 上下文管理

长对话是 Agent 的"记忆杀手"。DeepAgents 通过内置 Middleware 自动处理，无需手动配置：

**默认 Middleware 栈**（按执行顺序，来源：[官方文档](https://docs.langchain.com/oss/python/deepagents/customization#default-stack-main-agent)）：

```
 1. TodoListMiddleware         → 任务规划与跟踪
 2. SkillsMiddleware           → Skills 注入（仅当传 skills 时）
 3. FilesystemMiddleware       → 文件系统操作
 4. SubAgentMiddleware         → 子 Agent 委派
 5. SummarizationMiddleware    → 上下文压缩
 6. PatchToolCallsMiddleware   → 修复悬空/孤儿工具调用
 7. AsyncSubAgentMiddleware    → 异步子 Agent（仅当配置时）
 8. 你的自定义 Middleware      → 通过 middleware 参数传入
 9. Harness profile extras     → 模型 profile 的 provider 特定中间件
10. Excluded-tool filtering    → 排除工具过滤
11. Prompt caching             → Anthropic / Bedrock 缓存
12. MemoryMiddleware           → 长期记忆（仅当传 memory 时）
13. HumanInTheLoopMiddleware   → HITL（仅当传 interrupt_on 时）
```

**三种压缩策略**（自动触发）：

| 策略 | 触发条件 | 行为 |
|------|---------|------|
| Offloading 大输出 | 工具输出超过 20,000 tokens | 自动卸载到文件系统 |
| Offloading 大输入 | 上下文超过 85% 窗口 | 截断旧的 write/edit 调用 |
| Summarization | 前两种策略不够 | LLM 生成结构化摘要 |

你不需要自己写 `_compact_if_needed()` 方法——DeepAgents 帮你做了。

### 3.4 Skills

Skills 是"可复用的知识模块"。在 DeepAgents 中，Skills 存放在 `skills/` 目录下，每个 Skill 是一个文件夹，内含 `SKILL.md`。创建 Agent 时通过 `skills` 参数注入：

```python
# 目录结构
# skills/
#   owasp-top10/
#     SKILL.md

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

### 3.5 人工介入（HITL）

关键操作不能让 Agent 自己决定。DeepAgents 通过 `interrupt_on` 参数配置审批：

```python
agent = create_deep_agent(
    interrupt_on={
        "Bash": True,           # 所有 Bash 调用都需要审批
        "submit_report": True,  # 提交报告前需要审批
        "create_pr": True,      # 创建 PR 前需要审批
    }
)

# 运行时会自动暂停，等待人工确认
# 恢复执行：agent.invoke(Command(resume=True))
```

当 Agent 遇到需要审批的操作时，会暂停执行，等待人工确认后再继续。

### 3.6 MCP 集成

DeepAgents 通过 LangChain 的 MCP 适配器接入 MCP Server：

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

---

## 四、实战：构建一个代码审计 Agent

> 代码审计（Code Audit）是系统化地对源代码进行安全漏洞检测、合规性检查、风险分析的过程。它不同于代码审查（Code Review）——审计是"专项安全体检"，审查是"日常健康检查"。

### 4.1 代码审计是什么

| 维度 | 代码审计（Code Audit） | 代码审查（Code Review） |
|------|----------------------|----------------------|
| **执行者** | 专业安全团队/自动化工具 | 同侪开发者 |
| **时间点** | 上线前/定期专项 | 每次 PR/合并 |
| **深度** | 系统性、全面性 | 增量式、聚焦变更 |
| **标准** | OWASP/CWE/合规标准 | 团队编码规范 |
| **输出** | 正式审计报告 | Review Comments |

**核心目标**：

1. **发现安全漏洞**：SQL 注入、XSS、命令注入、越权访问、反序列化漏洞等
2. **确保合规性**：检查是否满足等保 2.0、GDPR、SOC2、PCI-DSS 等合规要求
3. **降低安全风险**：在代码上线前识别并修复安全隐患
4. **建立安全基线**：沉淀安全模式，形成团队可复用的安全编码规范

### 4.2 代码审计的工作内容

一次完整的代码审计覆盖 **七大维度**：

| 维度 | 检查要点 | 常见漏洞 |
|------|---------|---------|
| **注入漏洞** | 用户输入是否直接拼接到 SQL/命令/路径中？ | SQL 注入、命令注入、LDAP 注入 |
| **认证授权** | 认证逻辑是否有绕过风险？权限校验是否完整？ | 越权访问、会话固定、JWT 伪造 |
| **敏感数据** | 密码、密钥、Token 是否硬编码？日志中是否打印了敏感信息？ | 硬编码凭据、日志泄露、明文存储 |
| **加密安全** | 是否使用过时算法（MD5/SHA1/DES）？密钥是否硬编码？ | 弱加密算法、不安全随机数 |
| **依赖安全** | 第三方库是否存在已知 CVE？是否使用已停止维护的库？ | 供应链攻击、已知漏洞利用 |
| **配置安全** | 调试模式是否关闭？CORS 是否过于宽松？ | 信息泄露、Debug 端点暴露 |
| **日志安全** | 是否记录了安全操作？日志是否包含敏感信息？ | 日志注入、操作不可追溯 |

### 4.3 为什么用 Agent 做代码审计

**人工审计的三大瓶颈**：

| 瓶颈 | 具体表现 | 量化影响 |
|------|---------|---------|
| **效率低下** | 一个安全工程师一天只能审计 500-1000 行代码 | 中型项目（5 万行）需要 2-3 人月 |
| **知识盲区** | 单个工程师不可能精通所有语言、所有漏洞类型 | 熟悉的领域容易发现，陌生的容易漏掉 |
| **一致性差** | 不同审计人员标准不一，精力状态波动导致覆盖率不稳定 | 周二和周五的审计结果可能差异巨大 |

**Agent 的五大优势**：

| 优势 | 说明 |
|------|------|
| **理解上下文** | 不只是模式匹配——能理解代码的业务逻辑 |
| **多维度并行** | 多个子 Agent 同时从注入、认证、加密等维度并行审计 |
| **知识持续更新** | 通过 Skill 机制，随时加载最新的漏洞模式 |
| **生成可执行修复** | 不仅指出问题，还能生成具体的修复代码 |
| **自适应学习** | 对同一项目的重复审计，Agent 能记住项目特有的安全模式 |

**关键原则**：Agent 负责"发现"和"建议"，人负责"判断"和"决策"。严重漏洞必须经过人工确认（HITL）。

### 4.4 架构设计：四个子 Agent 协作

采用 Supervisor 编排模式：

```
                    ┌─────────────────────────────┐
                    │     Supervisor Agent         │
                    │   "审计任务总调度"            │
                    │   通过 task 工具委派子任务    │
                    └──────────┬──────────────────┘
                               │
      ┌────────────┬───────────┼───────────┬────────────┐
      ▼            ▼           ▼           ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Searcher │ │Security  │ │Compliance│ │ Report   │
│          │ │Auditor   │ │Checker   │ │Generator │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
"代码搜索    "安全漏洞    "合规性      "报告生成
 与检索"     检测"       检查"        与输出"
```

**各子 Agent 职责**：

| Agent | 角色 | 核心工具 |
|-------|------|---------|
| **Searcher** | 代码侦查员——扫描目标代码库，提取可疑代码片段 | `search_code`, `read_file`, `list_dependencies` |
| **SecurityAuditor** | 安全审计师——对提取的代码进行安全漏洞检测 | `check_sql_injection`, `check_xss`, `check_auth`, `check_crypto` |
| **ComplianceChecker** | 合规检查员——按合规标准逐项检查 | `check_data_privacy`, `check_logging`, `check_access_control` |
| **ReportGenerator** | 报告撰写员——汇总所有发现，生成结构化报告 | `format_report`, `calculate_risk`, `generate_fix` |

> **注意**：上述工具（如 `check_sql_injection`）是自定义工具，需要自己实现。你也可以用 MCP 适配器接入现成的安全扫描工具。

**三种编排模式**：

| 模式 | 说明 | 审计场景应用 |
|------|------|-------------|
| **Classify and Act** | 先分类，再分配专门子 Agent | 判断漏洞类型后分配给对应专家 |
| **Fanout and Synthesize** | 并行处理，汇总结果 | 对每个文件并行启动审计子 Agent |
| **Adversarial Verification** | 双盲验证，减少误报 | 两个 Agent 独立审计，一致才报告 |

### 4.5 代码实现

**4.5.1 创建 Supervisor**

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend

supervisor = create_deep_agent(
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
)
```

**4.5.2 配置子 Agent**

```python
# 子 Agent 定义为字典

searcher = {
    "name": "searcher",
    "description": "代码搜索与上下文提取专家。扫描目标代码库，提取可疑代码片段及上下文。",
    "system_prompt": """你是代码侦查专家。扫描目标代码库，提取所有可能存在安全风险的代码片段。
对每个可疑片段，提取：文件路径、行号、完整上下文（前后各 5 行）、功能描述、初步风险标记。
""",
    "tools": [search_code, read_file, list_dependencies],
}

security_auditor = {
    "name": "security_auditor",
    "description": "安全漏洞检测专家。对代码片段进行深度安全分析，覆盖 OWASP Top 10。",
    "system_prompt": """你是资深安全审计师，拥有 10 年渗透测试经验。
对每个可疑代码片段进行深度安全分析，覆盖：
- SQL 注入、命令注入、代码注入
- XSS（存储型/反射型/DOM 型）
- 认证绕过与会话管理缺陷
- 越权访问（水平越权/垂直越权）
- 敏感数据泄露（硬编码凭据、日志泄露、明文存储）
- 加密算法误用（弱算法、硬编码密钥、不安全随机数）

对每个发现，必须给出：漏洞名称和 CWE 编号、风险等级、攻击场景、修复代码。
""",
    "tools": [check_sql_injection, check_xss, check_auth, check_crypto],
}

compliance_checker = {
    "name": "compliance_checker",
    "description": "合规检查专家。按等保 2.0/GDPR/SOC2 标准检查代码。",
    "system_prompt": """你是合规检查专家，精通等保 2.0、GDPR、SOC2 等标准。
等保 2.0 检查要点：身份鉴别、访问控制、安全审计、数据保密性。
GDPR 检查要点：数据最小化、存储限制、用户权利。
""",
    "tools": [check_data_privacy, check_logging, check_access_control],
}

report_generator = {
    "name": "report_generator",
    "description": "报告撰写专家。汇总所有审计发现，生成结构化审计报告。",
    "system_prompt": """你是安全审计报告撰写专家。按风险等级排序，每个漏洞包含标题、CWE 编号、
风险等级、文件位置、代码片段、攻击场景、修复方案。提供合规检查结果和风险统计。
""",
    "tools": [format_report, calculate_risk_score, generate_fix],
}
```

**4.5.3 运行审计**

```python
result = supervisor.invoke({
    "messages": [{
        "role": "user",
        "content": "审计 src/api 目录下所有代码，按等保 2.0 标准，生成完整审计报告"
    }],
})

print(result["messages"][-1].content)
```

**运行日志示例**：

```
[Supervisor] 任务拆解完成，委派 Searcher 开始扫描...
[Searcher] 发现 247 个文件，提取 83 个可疑代码片段
[Supervisor] 委派 SecurityAuditor 和 ComplianceChecker 并行分析...
[SecurityAuditor] 发现 12 个漏洞：严重 3 / 高危 5 / 中危 3 / 低危 1
[ComplianceChecker] 合规检查：2 项不合规

[HITL] 检测到严重漏洞，提交审计报告前等待审批...
[用户] APPROVE

[ReportGenerator] 生成最终报告...
审计完成。共发现 12 个漏洞，2 项不合规。
```

### 4.6 审计报告格式（精简版）

```markdown
# 代码安全审计报告

项目：ShopX 电商平台 | 日期：2026-06-30 | 范围：src/api/ (247 文件)

## 审计摘要

| 维度 | 扫描 | 通过 | 不合规 |
|------|------|------|--------|
| 注入漏洞 | 47 | 44 | 3 |
| 认证授权 | 23 | 21 | 2 |
| 敏感数据 | 31 | 29 | 2 |
| 合计 | 155 | 143 | 12 |

## 严重漏洞

### [严重] CWE-89 SQL 注入 - `src/api/auth.py:47`
`query = f"SELECT * FROM users WHERE username='{username}'"`
→ 修复：`cursor.execute("SELECT * FROM users WHERE username=?", (username,))`

### [严重] CWE-284 水平越权 - `src/api/order.py:112`
`return Order.query.get(order_id)`  // 未校验所有权
→ 修复：添加 `if order.user_id != current_user.id: raise Forbidden`

### [严重] CWE-798 硬编码凭据 - `src/config/database.py:12`
`DATABASE_URL = "mysql://admin:MyP@ssw0rd123@localhost:3306/shopx"`
→ 修复：`DATABASE_URL = os.getenv("DATABASE_URL")`

## 合规检查

| 等保 2.0 要求 | 状态 |
|-------------|------|
| 身份鉴别 | 不合规 |
| 访问控制 | 不合规 |
| 数据保密性 | 不合规 |
| 通信保密性 | 合规 |

## 风险统计

严重 3 个（24h 内修复）| 高危 5 个（本次迭代）| 中危 3 个（下一迭代）| 低危 1 个（跟踪）
```

---

## 五、生产部署

### 5.1 与 LangSmith 集成

DeepAgents 天然集成了 LangSmith，用于追踪、评估和监控：

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-langsmith-api-key"

agent = create_deep_agent(model="openai:gpt-4o")
```

LangSmith 能帮你看到：每次审计的完整调用链、每个子 Agent 的 Token 消耗、漏洞发现的准确率和召回率、审计耗时分布。

### 5.2 LangSmith Deployment Agent Server

DeepAgents 的生产部署通过 LangSmith Deployment 的 **Agent Server** 实现：

| 能力 | 说明 |
|------|------|
| 持久化执行 | Agent 运行中断后可从检查点恢复 |
| HITL 暂停 | 可等待人工审批数小时甚至数天 |
| 多租户 | 不同用户的 Agent 会话隔离 |
| 定时任务 | 支持 cron 调度 |

### 5.3 沙箱安全配置

```python
from deepagents.backends import SandboxBackend

agent = create_deep_agent(
    backend=SandboxBackend(
        allowed_commands=["ls", "cat", "grep", "find"],
        network="blocked",
        filesystem="readonly",
    )
)
```

### 5.4 成本控制

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

---

## 六、选型建议

| 场景 | 推荐方案 | 为什么 |
|------|---------|--------|
| 学习 Agent 原理 | 纯 Python 手写 | 理解每一行代码在做什么 |
| 快速落地代码审计 | **DeepAgents** | 文件系统、子 Agent、HITL 全部内置 |
| 需要极致定制 | 纯 Python / LangGraph | 完全控制每个细节 |
| 非开发者参与审计 | Dify / Coze 平台 | 可视化配置，无需编程 |
| 企业级合规审计 | **DeepAgents + LangSmith** | 可追溯、可评估、可审计 |

> **小结**：DeepAgents 是 2026 年 Agent 开发"快速落地"的最佳选择。它把 Agent 开发中最繁琐的部分——文件系统、子 Agent 委派、上下文管理、HITL——全部通过内置 Middleware 预装好了。你用几十行代码就能搭建一个专业级的代码安全审计系统，而不用从零写几百行基础设施代码。
