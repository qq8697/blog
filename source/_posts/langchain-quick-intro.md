---
title: LangChain 快速入门
date: 2026-06-30 12:00:00
categories:
  - 技术
  - AI
tags:
  - Agent开发
  - LangChain
  - 代码审计
  - RAG
  - LangSmith
---

> 本篇用 LangChain 构建一个**代码安全审计 Agent**——自动检测 SQL 注入、XSS、硬编码凭据，并结合 RAG 注入漏洞知识库提升审计准确性。下一篇 [LangGraph 快速入门](/blog/2026/07/langgraph-quick-intro/) 将在此基础上引入多 Agent 图编排。

---

## 一、LangChain 是什么

**[LangChain](https://github.com/langchain-ai/langchain) 是 LLM 应用的"标准库"**——把大模型调用、Prompt 模板、工具定义、文档检索、输出解析统一为可组合的组件，让你不用每次都从零写胶水代码。

如果你用纯 Python 写 Agent ，需要自己处理：
- OpenAI / Anthropic API 的调用封装
- JSON Schema 工具定义
- ReAct 循环控制
- 流式输出、批处理
- 错误重试与 Fallback

LangChain 把这些全部抽象成了**统一接口**，每个环节都是可插拔的组件。

### 1.1 LangChain 在 [langchain-ai](https://github.com/langchain-ai) 生态中的位置

```
┌──────────────────────────────────────────────────────┐
│  LangChain（create_agent：高层 API，入门首选）           │
│  ──────────────────────────────────────────────────  │
│  LangGraph（底层运行时：StateGraph，需要自定义时用）      │
├──────────────────────────────────────────────────────┤
│  LangSmith（可观测性、评估、监控，贯穿全链路）            │
├──────────────────────────────────────────────────────┤
│  DeepAgents（batteries-included：预装文件系统/子Agent）  │
└──────────────────────────────────────────────────────┘
```

> LangChain 的 `create_agent` 底层就是 LangGraph 运行时，自动获得持久化、流式输出、Human-in-the-Loop 等能力。

| 层 | 职责 | 覆盖文章 |
|----|------|--------|
| LangChain | `create_agent` 高层 API + LLM/Prompt/Tool 标准组件 | 本篇 |
| LangGraph | 用状态图编排 Agent Loop 和多 Agent 协作 | 下一篇 |
| LangSmith | Trace、评估、监控 | 第六章 |
| [DeepAgents](/oss/python/deepagents/overview/) | 预装文件系统、子 Agent、上下文压缩的 batteries-included 底盘 | 再下一篇 |

### 1.2 2026 年模块化架构

LangChain 已经从"大一统包"拆分为模块化架构：

| 包名 | 职责 |
|------|------|
| `langchain-core` | 抽象接口层：Runnable、ChatModel、Tool 等基类定义 |
| `langchain` | 实现层：`create_agent`、Chain、Retriever 等组合逻辑 |
| `langchain-openai` | OpenAI 模型适配（GPT-5.5、o1 等） |
| `langchain-anthropic` | Anthropic 模型适配（Claude Sonnet 4 等） |
| `langchain-text-splitters` | 文本分割器（RAG 分块用） |
| `langchain-community` | 社区贡献的集成（向量库、Loader 等） |

### 1.3 安装

```bash
pip install langchain "langchain[openai]" langchain-community langchain-text-splitters
# 可选：向量库（第四章 RAG 需要）
pip install faiss-cpu
# 可选：本地模型（Ollama）
pip install langchain-ollama
```

当前版本：`langchain-core` v1.5.x（2026 年 7 月）。LangChain 与 LangGraph 于 2025 年 10 月联合发布 1.0 GA。

### 1.4 核心设计哲学：Runnable 接口

LangChain 的一切组件（LLM、Prompt、Parser、Retriever、Tool）都实现了 **Runnable 接口**：

| 方法 | 说明 |
|------|------|
| `invoke(input)` | 同步调用，输入 → 输出 |
| `ainvoke(input)` | 异步调用 |
| `batch(inputs)` | 批量调用 |
| `stream(input)` | 流式输出 |

写一个组件，自动获得四种运行模式——不需要手动实现。

---

## 二、核心组件

### 2.1 ChatModel：LLM 调用标准接口

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o", temperature=0)

# invoke：最简单的调用
response = llm.invoke("什么是 SQL 注入？")
print(response.content)

# stream：流式输出
for chunk in llm.stream("用三句话解释 XSS"):
    print(chunk.content, end="", flush=True)

# batch：批量调用
results = llm.batch([
    "什么是 SQL 注入？",
    "什么是硬编码凭据？",
    "什么是 CSRF？"
])
```

**与纯 Python 调 OpenAI 的对比**：

| 维度 | 纯 Python（openai SDK） | LangChain ChatModel |
|------|------------------------|---------------------|
| 切换模型 | 改代码（不同 SDK） | 换实例（`ChatOpenAI` → `ChatAnthropic`） |
| 流式输出 | 手动处理 stream 响应 | `.stream()` 一行搞定 |
| 批量 | 手动循环 | `.batch()` 自动并发 |
| 重试 | 手动 try/except | 内置 `.with_retry()` |

### 2.2 PromptTemplate：参数化提示词

```python
from langchain_core.prompts import ChatPromptTemplate

# 创建模板
audit_prompt = ChatPromptTemplate.from_messages([
    ("system", "你是代码安全审计专家。按 OWASP Top 10 标准审计代码。"),
    ("human", "审计以下代码，找出安全漏洞：\n\n{code}")
])

# invoke：传入参数，生成完整 Prompt
messages = audit_prompt.invoke({
    "code": "query = f\"SELECT * FROM users WHERE name='{username}'\""
})
```

### 2.3 @tool 装饰器：工具定义

```python
from langchain_core.tools import tool

@tool
def check_sql_injection(code: str) -> str:
    """检测代码中是否存在 SQL 注入漏洞。
    检查 f-string、字符串拼接、format() 等不安全的 SQL 构建方式。"""
    import re
    patterns = [
        r'f".*SELECT.*\{',      # f-string 拼接 SQL
        r'".*SELECT.*".*\+',    # 字符串拼接 SQL
        r'\.format\(.*SELECT',  # format() 拼接 SQL
    ]
    findings = []
    for pattern in patterns:
        matches = re.findall(pattern, code, re.IGNORECASE)
        if matches:
            findings.append(f"发现 {len(matches)} 处疑似 SQL 注入：{matches[0][:50]}...")
    return "\n".join(findings) if findings else "未发现 SQL 注入风险"

# Tool 对象自动生成 JSON Schema
print(check_sql_injection.name)          # "check_sql_injection"
print(check_sql_injection.description)   # "检测代码中是否存在 SQL 注入漏洞..."
print(check_sql_injection.args_schema)   # Pydantic schema
```

**与纯 Python 版 JSON Schema 对比**：

| 维度 | 纯 Python | LangChain @tool |
|------|----------|----------------|
| Schema 定义 | 手写 JSON Schema 字典 | docstring + 类型注解自动生成 |
| 参数校验 | 手动 | Pydantic 自动校验 |
| 错误处理 | 手动 try/except | 框架包装 |

### 2.4 OutputParser：结构化输出

```python
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

class AuditFinding(BaseModel):
    """审计发现"""
    vulnerability: str = Field(description="漏洞名称")
    cwe_id: str = Field(description="CWE 编号，如 CWE-89")
    severity: str = Field(description="严重等级：严重/高危/中危/低危")
    location: str = Field(description="文件位置，如 auth.py:47")
    description: str = Field(description="漏洞描述和攻击场景")
    fix: str = Field(description="修复建议，包含修复代码")

parser = PydanticOutputParser(pydantic_object=AuditFinding)

# 将解析指令注入 Prompt
audit_prompt_with_parser = ChatPromptTemplate.from_messages([
    ("system", "你是代码安全审计专家。{format_instructions}"),
    ("human", "审计这段代码：\n{code}")
])

messages = audit_prompt_with_parser.invoke({
    "code": "query = f'SELECT * FROM users WHERE id={user_input}'",
    "format_instructions": parser.get_format_instructions()
})

# LLM 返回 JSON → 自动解析为 Pydantic 对象
response = llm.invoke(messages)
finding = parser.parse(response.content)
print(f"[{finding.severity}] {finding.vulnerability} ({finding.cwe_id})")
print(f"位置：{finding.location}")
print(f"修复：{finding.fix}")
```

### 2.5 LCEL 链：用 `|` 管道符组合组件

**LCEL（LangChain Expression Language）** 是 LangChain 的组合语言：

```python
from langchain_core.output_parsers import StrOutputParser

# 定义组件
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是代码安全专家，用三句话解释漏洞。"),
    ("human", "{vulnerability}")
])
llm = ChatOpenAI(model="gpt-4o", temperature=0)
parser = StrOutputParser()

# LCEL：用 | 组合成链
chain = prompt | llm | parser

# 运行
result = chain.invoke({"vulnerability": "SQL 注入"})
print(result)

# 同一个链，自动支持流式
for chunk in chain.stream({"vulnerability": "XSS"}):
    print(chunk, end="", flush=True)

# 批量处理
results = chain.batch([
    {"vulnerability": "CSRF"},
    {"vulnerability": "目录遍历"},
])
```

---

## 三、工具调用与 Agent

### 3.1 bind_tools()：绑定工具到模型

LangChain 的 Tool Calling 利用模型原生的 function calling 能力：

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

@tool
def read_file(path: str) -> str:
    """读取指定路径的文件内容"""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@tool
def check_hardcoded_secrets(code: str) -> str:
    """检测代码中是否存在硬编码的密码、API Key 或 Token"""
    import re
    patterns = [
        r'password\s*=\s*["\'][^"\']{8,}["\']',
        r'api[_-]?key\s*=\s*["\'][^"\']{16,}["\']',
        r'token\s*=\s*["\'][A-Za-z0-9_\-]{20,}["\']',
        r'mysql://\w+:[^@]+@',  # 数据库连接串含密码
    ]
    findings = []
    for pattern in patterns:
        matches = re.findall(pattern, code, re.IGNORECASE)
        if matches:
            findings.append(f"发现硬编码凭据：{matches[0][:30]}...")
    return "\n".join(findings) if findings else "未发现硬编码凭据"

# 绑定工具到模型
llm = ChatOpenAI(model="gpt-4o")
llm_with_tools = llm.bind_tools([read_file, check_hardcoded_secrets, check_sql_injection])

# 模型会根据用户问题决定是否调用工具
response = llm_with_tools.invoke("审计 auth.py 中的硬编码凭据")
print(response.tool_calls)
# [{"name": "read_file", "args": {"path": "auth.py"}, "id": "call_xxx"}]
```

### 3.2 构建完整 Agent（`create_agent`）

LangChain 1.0 引入了 `create_agent` 作为 Agent 的高层 API（底层基于 LangGraph 运行时），取代了旧版的 `AgentExecutor`：

```python
from langchain.agents import create_agent
from langchain.tools import tool
import os

@tool
def read_file(path: str) -> str:
    """读取指定路径的文件内容"""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

# create_agent：一行创建 Agent
# model 使用 "provider:model" 格式，自动初始化模型
agent = create_agent(
    model="openai:gpt-4o",
    tools=[read_file, check_sql_injection, check_hardcoded_secrets, check_xss],
    system_prompt="""你是代码安全审计专家。
使用工具读取代码文件，检测安全漏洞（SQL 注入、硬编码凭据、XSS）。
对每个发现，给出漏洞名称、CWE 编号、严重等级和修复建议。""",
)

# 运行审计（create_agent 底层是 LangGraph，自动获得持久化和流式能力）
result = agent.invoke({
    "messages": [{"role": "user", "content": "审计 ./src/api/auth.py 的安全性，找出所有漏洞"}]
})
print(result["messages"][-1].content_blocks)
```

**运行日志**（LangGraph 运行时自动打印每一步）：

```
[LLM] 决定调用 read_file
  参数：{"path": "./src/api/auth.py"}
[Tool] read_file 返回文件内容
[LLM] 决定调用 check_sql_injection
  参数：{"code": "..."}
[Tool] 发现 1 处疑似 SQL 注入：f"SELECT * FROM users WHERE name='{username}'"...
[LLM] 决定调用 check_hardcoded_secrets
[Tool] 发现硬编码凭据：DATABASE_URL = "mysql://admin:MyP@ss...
[LLM] 审计完成。发现 2 个漏洞：
  1. [严重] CWE-89 SQL 注入（auth.py:47）
  2. [严重] CWE-798 硬编码凭据（auth.py:12）
```

### 3.3 与纯 Python ReAct 循环对比

| 维度 | 纯 Python ReAct | LangChain `create_agent` |
|------|----------------|------------------------|
| 循环控制 | 手写 `while True` | LangGraph 运行时自动管理 |
| Tool 结果注入 | 手动 append message | 自动 |
| 状态持久化 | 手动实现 | 内置 checkpointing |
| 人工介入（HITL） | 手动 `input()` | Human-in-the-loop 原生支持 |
| 流式输出 | 手动处理 stream | `.stream()` 直接可用 |
| 错误恢复 | 手动 try/except | 内置重试 + middleware |
| 工具绑定 | 手动 JSON Schema | `@tool` 自动生成 |

**一句话总结**：`create_agent` 底层就是 LangGraph 运行时，帮你省了"循环控制 + 上下文管理 + 错误处理 + 持久化"这些胶水代码，让你专注于工具定义和业务逻辑。

### 3.4 错误处理：Middleware 与 Fallback

`create_agent` 通过 **middleware** 机制扩展 Agent 行为（错误重试、防护栏、路由等）：

```python
from langchain.agents import create_agent

# 通过 middleware 添加错误重试、防护栏等
agent = create_agent(
    model="openai:gpt-4o",
    tools=[read_file, check_sql_injection],
    system_prompt="你是代码安全审计专家。",
    middleware=[
        # 伪码：内置 middleware 示例
        # RetryMiddleware(max_retries=3)   → 工具调用失败自动重试
        # GuardrailMiddleware(...)         → 输入/输出安全检查
    ],
)

# 模型层面的 Fallback：主模型不可用时切换
# create_agent 支持传入 model_provider 动态选择
agent_fallback = create_agent(
    model="openai:gpt-4o",       # 主模型
    # 如果 OpenAI 不可用，切换 model="anthropic:claude-sonnet-4-6"
    tools=[read_file, check_sql_injection],
    system_prompt="你是代码安全审计专家。",
)
```

---

## 四、实战——用 LangChain 构建代码审计 Agent

> 代码审计（Code Audit）是系统化地对源代码进行安全漏洞检测的过程。它不同于代码审查（Code Review）——审计是"专项安全体检"，审查是"日常健康检查"。

### 4.1 审计目标

审计单个 Python 文件，发现三类常见漏洞：
- **SQL 注入**（CWE-89）：用户输入直接拼接到 SQL 语句
- **硬编码凭据**（CWE-798）：密码、API Key 明文写在代码中
- **XSS**（CWE-79）：用户输入未经转义直接输出到 HTML

### 4.2 定义审计工具

```python
from langchain_core.tools import tool
import re
import os

@tool
def read_file(path: str) -> str:
    """读取指定路径的文件内容"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"文件不存在：{path}"

@tool
def check_sql_injection(code: str) -> str:
    """检测代码中是否存在 SQL 注入漏洞（CWE-89）。
    检查 f-string、字符串拼接、format() 等不安全的 SQL 构建方式。"""
    patterns = [
        (r'f["\'].*(?:SELECT|INSERT|UPDATE|DELETE).*\{', "f-string 拼接 SQL"),
        (r'["\'].*(?:SELECT|INSERT|UPDATE|DELETE).*["\'].*\+', "字符串拼接 SQL"),
        (r'\.format\(.*(?:SELECT|INSERT|UPDATE|DELETE)', "format() 拼接 SQL"),
        (r'%s.*(?:SELECT|INSERT|UPDATE|DELETE)', "%s 格式化 SQL"),
    ]
    findings = []
    for i, line in enumerate(code.split("\n"), 1):
        for pattern, desc in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                findings.append(f"行 {i}：{desc}\n  {line.strip()}")
    return "\n".join(findings) if findings else "未发现 SQL 注入风险"

@tool
def check_hardcoded_secrets(code: str) -> str:
    """检测代码中是否存在硬编码的密码、API Key 或 Token（CWE-798）。"""
    patterns = [
        (r'(?:password|passwd|pwd)\s*=\s*["\'][^"\']{6,}["\']', "硬编码密码"),
        (r'(?:api[_-]?key|apikey|secret[_-]?key)\s*=\s*["\'][^"\']{16,}["\']', "硬编码 API Key"),
        (r'(?:mysql|postgresql|mongodb)://\w+:[^@\s]+@', "数据库连接串含明文密码"),
        (r'(?:AKIA|sk-|ghp_)[A-Za-z0-9]{16,}', "云服务/平台 Token"),
    ]
    findings = []
    for i, line in enumerate(code.split("\n"), 1):
        for pattern, desc in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                findings.append(f"行 {i}：{desc}\n  {line.strip()}")
    return "\n".join(findings) if findings else "未发现硬编码凭据"

@tool
def check_xss(code: str) -> str:
    """检测代码中是否存在 XSS 漏洞（CWE-79）。
    检查用户输入未经转义直接输出到 HTML/模板的情况。"""
    patterns = [
        (r'render_template_string\(.*\+', "模板字符串拼接用户输入"),
        (r'\.innerHTML\s*=', "直接设置 innerHTML"),
        (r'document\.write\(', "document.write 未转义输出"),
        (r'Markup\(.*\+', "Flask Markup 拼接"),
    ]
    findings = []
    for i, line in enumerate(code.split("\n"), 1):
        for pattern, desc in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                findings.append(f"行 {i}：{desc}\n  {line.strip()}")
    return "\n".join(findings) if findings else "未发现 XSS 风险"
```

> **免责声明**：本文正则仅用于演示 LangChain 工具定义，生产环境建议使用 [Semgrep](https://semgrep.dev/)、[Bandit](https://github.com/PyCQA/bandit) 等专业静态分析工具，或调用 CodeQL API。

### 4.3 定义结构化输出

```python
from pydantic import BaseModel, Field

class AuditFinding(BaseModel):
    """单条审计发现"""
    vulnerability: str = Field(description="漏洞名称")
    cwe_id: str = Field(description="CWE 编号，如 CWE-89")
    severity: str = Field(description="严重等级：严重/高危/中危/低危")
    location: str = Field(description="文件:行号")
    code_snippet: str = Field(description="问题代码片段")
    attack_scenario: str = Field(description="攻击场景描述")
    fix: str = Field(description="修复代码")

class AuditReport(BaseModel):
    """完整审计报告"""
    file: str = Field(description="审计文件路径")
    findings: list[AuditFinding] = Field(description="所有发现")
    summary: str = Field(description="审计摘要")
```

### 4.4 构建审计 Agent

```python
from langchain.agents import create_agent

# create_agent：用 system_prompt 定义审计流程
audit_agent = create_agent(
    model="openai:gpt-4o",
    tools=[read_file, check_sql_injection, check_hardcoded_secrets, check_xss],
    system_prompt="""你是资深代码安全审计专家，精通 OWASP Top 10 和 CWE 标准。

审计流程：
1. 使用 read_file 读取目标文件
2. 依次使用 check_sql_injection、check_hardcoded_secrets、check_xss 检测漏洞
3. 对每个发现，给出完整的审计报告

输出格式要求：
- 每个漏洞包含：漏洞名称、CWE 编号、严重等级、文件位置、代码片段、攻击场景、修复代码
- 按严重等级排序（严重 > 高危 > 中危 > 低危）
- 最后给出审计摘要""",
)
```

### 4.5 运行审计

```python
result = audit_agent.invoke({
    "messages": [{"role": "user", "content": "审计 ./src/api/auth.py 的安全性，生成完整审计报告"}]
})
print(result["messages"][-1].content_blocks)
```

**运行日志**：

```
[LLM] 决定调用 read_file
  参数：{"path": "./src/api/auth.py"}
[Tool] read_file 返回文件内容
[LLM] 决定调用 check_sql_injection
  参数：{"code": "..."}
[Tool] 行 47：f-string 拼接 SQL
  query = f"SELECT * FROM users WHERE username='{username}'"
[LLM] 决定调用 check_hardcoded_secrets
[Tool] 行 12：数据库连接串含明文密码
  DATABASE_URL = "mysql://admin:MyP@ssw0rd123@localhost:3306/shopx"
[LLM] 决定调用 check_xss
[Tool] 未发现 XSS 风险
[LLM] 审计报告生成完成：
```

### 4.6 RAG 增强：注入漏洞知识库

单纯靠工具检测可能漏掉一些复杂场景。通过 RAG 加载 OWASP/CWE 知识库，让 Agent 在审计时参考权威漏洞模式：

```python
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

# 1. 加载知识库（假设已有 owasp-top10.md 和 cwe-database.md）
loaders = [
    TextLoader("./knowledge/owasp-top10.md", encoding="utf-8"),
    TextLoader("./knowledge/cwe-database.md", encoding="utf-8"),
]
docs = []
for loader in loaders:
    docs.extend(loader.load())

# 2. 分块
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
chunks = splitter.split_documents(docs)

# 3. 向量化 + 存储
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = FAISS.from_documents(chunks, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# 4. 构建 RAG 增强的审计链
from langchain_core.runnables import RunnablePassthrough

rag_audit_prompt = ChatPromptTemplate.from_messages([
    ("system", """你是代码安全审计专家。参考以下漏洞知识库进行审计：

{context}

审计要求：
1. 对照知识库中的漏洞模式检测代码
2. 对每个发现给出 CWE 编号和修复建议"""),
    ("human", "{question}")
])

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_audit_chain = (
    {
        "context": retriever | format_docs,
        "question": RunnablePassthrough()
    }
    | rag_audit_prompt
    | llm
    | StrOutputParser()
)

# 运行 RAG 增强的审计
answer = rag_audit_chain.invoke(
    "审计以下代码：\n" + open("./src/api/auth.py").read()
)
```

### 4.7 审计报告示例

`````markdown
# 代码安全审计报告

文件：./src/api/auth.py | 审计时间：2026-06-30 | 代码行数：156

## 审计摘要

| 严重等级 | 数量 |
|---------|------|
| 严重 | 2 |
| 高危 | 1 |
| 中危 | 0 |
| 低危 | 0 |

## 漏洞详情

### [严重] CWE-89 SQL 注入

**位置**：auth.py:47

**代码**：
```python
query = f"SELECT * FROM users WHERE username='{username}'"
```

**攻击场景**：攻击者输入 `' OR '1'='1` 可绕过认证，或输入 `' UNION SELECT * FROM admin--` 获取管理员数据。
**修复**：
```python
cursor.execute("SELECT * FROM users WHERE username=?", (username,))
```

### [严重] CWE-798 硬编码凭据

**位置**：auth.py:12
**代码**：
```python
DATABASE_URL = "mysql://admin:MyP@ssw0rd123@localhost:3306/shopx"
```
**攻击场景**：代码泄露（如 Git 仓库公开）直接暴露数据库凭据，攻击者可接管数据库。
**修复**：
```python
DATABASE_URL = os.getenv("DATABASE_URL")
```

### [高危] CWE-791 信息泄露

**位置**：auth.py:89
**代码**：
```python
except Exception as e:
    return {"error": str(e)}  # 直接返回异常信息
```
**攻击场景**：攻击者通过构造异常输入获取系统内部信息（数据库结构、路径等）。
**修复**：
```python
except Exception as e:
    logger.error(f"认证失败：{e}")
    return {"error": "认证失败，请检查用户名和密码"}
```
`````

---

## 五、流式输出与批处理

### 5.1 流式输出：实时显示审计进度

`create_agent` 底层是 LangGraph 运行时，支持三种流式模式：

```python
# stream_mode="updates"：每步输出状态增量
for event in audit_agent.stream(
    {"messages": [{"role": "user", "content": "审计 ./src/api/auth.py"}]},
    stream_mode="updates"
):
    print(event)  # {"agent": {...}, "tools": {...}}

# stream_mode="messages"：逐 Token 流式输出 LLM 生成
for event in audit_agent.stream(
    {"messages": [{"role": "user", "content": "审计 ./src/api/auth.py"}]},
    stream_mode="messages"
):
    print(event)  # (AIMessageChunk, metadata)
```

### 5.2 批处理：审计多个文件

```python
import glob

# 获取目录下所有 Python 文件
py_files = glob.glob("./src/api/**/*.py", recursive=True)

# 批量审计（每个文件独立调用）
audit_tasks = [
    {"messages": [{"role": "user", "content": f"审计 {f} 的安全性，列出所有漏洞"}]}
    for f in py_files
]

# batch：并发审计多个文件
results = audit_agent.batch(audit_tasks)

# 汇总结果
for f, result in zip(py_files, results):
    print(f"\n{'='*50}")
    print(f"文件：{f}")
    print(result["messages"][-1].content_blocks)
```

### 5.3 异步并发审计

```python
import asyncio

async def audit_all_files():
    # 异步批量审计
    results = await audit_agent.abatch(audit_tasks)
    return results

# 运行
results = asyncio.run(audit_all_files())
```

**性能对比**（审计 20 个 Python 文件）：

| 模式 | 耗时 | 说明 |
|------|------|------|
| 串行 `invoke` | ~120s | 一个接一个 |
| 批量 `batch` | ~30s | 框架自动并发 |
| 异步 `abatch` | ~30s | 协程并发 |

---

## 六、LangSmith 可观测性与生产部署

### 6.1 零代码集成 Trace

只需设置环境变量，LangChain 自动上报 Trace：

```python
import os
os.environ["LANGSMITH_TRACING"] = "true"  # 或 "LANGCHAIN_TRACING_V2"
os.environ["LANGSMITH_API_KEY"] = "your-api-key"
os.environ["LANGSMITH_PROJECT"] = "code-audit-agent"

# 代码完全不用改——LangChain 自动检测环境变量并上报
audit_agent.invoke({"messages": [{"role": "user", "content": "审计 auth.py"}]})
```

### 6.2 Trace 示例

一次审计调用的 Trace 会展示完整链路：

```
📊 Trace: "审计 ./src/api/auth.py"
├── 🤖 LLM Call (gpt-4o)        | 1.2s | 180 tokens
│   └── 决定调用 read_file
├── 🔧 Tool: read_file("auth.py")  | 0.02s
│   └── 返回 156 行代码
├── 🤖 LLM Call (gpt-4o)        | 0.8s | 200 tokens
│   └── 决定调用 check_sql_injection
├── 🔧 Tool: check_sql_injection   | 0.05s
│   └── 发现 1 处 SQL 注入
├── 🤖 LLM Call (gpt-4o)        | 0.6s | 150 tokens
│   └── 决定调用 check_hardcoded_secrets
├── 🔧 Tool: check_hardcoded_secrets | 0.03s
│   └── 发现 1 处硬编码凭据
└── 🤖 LLM Call (gpt-4o)        | 1.5s | 400 tokens
    └── 生成审计报告
```

LangSmith 帮你看到：每次审计的完整调用链、每个工具的耗时、Token 消耗分布、审计结果的准确率。

### 6.3 生产 Checklist

| 维度 | 建议 |
|------|------|
| 模型 Fallback | 准备备用模型（如 `anthropic:claude-sonnet-4-6`），主模型不可用时切换 |
| 成本追踪 | 通过 LangSmith 查看每次审计的 Token 消耗分布 |
| Middleware | 使用内置 middleware 添加错误重试、防护栏、路由等 |
| 超时控制 | 在调用层设置超时，防止单次审计卡死 |
| 沙箱执行 | 审计不可信代码时，使用 Docker 沙箱隔离 |
| 检查点 | `create_agent` 底层自动支持 checkpointing，可恢复中断的审计 |

### 6.4 从 LangChain 到 LangGraph

LangChain 的 `create_agent` 是**单 Agent**（底层是 LangGraph 运行时）。当你需要：
- 多个 Agent 并行扫描不同目录
- Supervisor 统一调度专业 Agent
- 审计中途暂停等待人工确认

——就需要直接使用 **LangGraph** 的 `StateGraph` 来编排。

[下一篇](/blog/2026/07/langgraph-quick-intro/)将用 LangGraph 构建一个**多 Agent 代码审计系统**：Supervisor + Searcher + Auditor + Reporter，支持 Human-in-the-Loop 和状态持久化。

---

> **选型总结**：
> - **单文件审计**（工具调用 + RAG）→ LangChain `create_agent` 足够
> - **多目录并行审计**（多 Agent 编排）→ LangGraph
> - **完整项目审计**（预装一切）→ [DeepAgents](https://docs.langchain.com/oss/python/deepagents/overview/)
