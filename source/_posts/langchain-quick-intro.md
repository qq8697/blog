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
  - Python
  - LangSmith
---

> 本文是 Agent 开发系列的第三篇。前两篇分别讲了 [Agent 概念入门](/blog/2026/06/agent-quick-intro/) 和 [纯 Python 从零实现 Agent](/blog/2026/06/agent-dev-quick-intro/)。本篇切换到框架视角，用 LangChain 构建一个**代码安全审计 Agent**——自动检测 SQL 注入、XSS、硬编码凭据，并结合 RAG 注入漏洞知识库提升审计准确性。下一篇 [LangGraph 快速入门](/blog/2026/07/langgraph-quick-intro/) 将在此基础上引入多 Agent 图编排。

---

## 一、LangChain 是什么

**LangChain 是 LLM 应用的"标准库"**——把大模型调用、Prompt 模板、工具定义、文档检索、输出解析统一为可组合的组件，让你不用每次都从零写胶水代码。

如果你用纯 Python 写 Agent（参考[上一篇](/blog/2026/06/agent-dev-quick-intro/)），需要自己处理：
- OpenAI / Anthropic API 的调用封装
- JSON Schema 工具定义
- ReAct 循环控制
- 流式输出、批处理
- 错误重试与 Fallback

LangChain 把这些全部抽象成了**统一接口**，每个环节都是可插拔的组件。

### 1.1 LangChain 在 Agent 生态中的位置

```
LangChain（组件层）→ LangGraph（编排层）→ LangSmith（可观测层）→ DeepAgents（电池全装好的底盘）
```

| 层 | 职责 | 覆盖文章 |
|----|------|---------|
| LangChain | LLM 调用、Prompt、Tool、Retriever 等标准组件 | 本篇 |
| LangGraph | 用状态图编排 Agent Loop 和多 Agent 协作 | 下一篇 |
| LangSmith | Trace、评估、监控 | 第六章 |
| DeepAgents | 预装文件系统、子 Agent、上下文压缩 | 再下一篇 |

### 1.2 2026 年模块化架构

LangChain 已经从"大一统包"拆分为模块化架构：

| 包名 | 职责 |
|------|------|
| `langchain-core` | 抽象接口层：Runnable、ChatModel、Tool 等基类定义 |
| `langchain` | 实现层：Chain、Agent、Retriever 等组合逻辑 |
| `langchain-openai` | OpenAI 模型适配（GPT-4o、o1 等） |
| `langchain-anthropic` | Anthropic 模型适配（Claude 等） |
| `langchain-community` | 社区贡献的集成（向量库、Loader 等） |

### 1.3 安装

```bash
pip install langchain langchain-openai langchain-community
# 可选：向量库（第五章 RAG 需要）
pip install faiss-cpu
```

当前版本：`langchain` v0.3.x（2026 年 6 月）。

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

### 3.2 构建完整 Agent

```python
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

# 创建 Prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", """你是代码安全审计专家。
使用工具读取代码文件，检测安全漏洞（SQL 注入、硬编码凭据、XSS）。
对每个发现，给出漏洞名称、CWE 编号、严重等级和修复建议。"""),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}")  # Agent 的思考过程
])

# 工具列表
tools = [read_file, check_sql_injection, check_hardcoded_secrets, check_xss]

# 创建 Agent
llm = ChatOpenAI(model="gpt-4o", temperature=0)
agent = create_tool_calling_agent(llm, tools, prompt)

# 包装为 Executor（负责运行 Agent 循环）
executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,  # 打印每一步执行日志
    max_iterations=10  # 防止无限循环
)

# 运行审计
result = executor.invoke({
    "input": "审计 ./src/api/auth.py 的安全性，找出所有漏洞"
})
print(result["output"])
```

**AgentExecutor 的 verbose 模式会打印每一步**：

```
> Entering new AgentExecutor chain...
> Invoking: `read_file` with `{'path': './src/api/auth.py'}`
> [文件内容返回]
> Invoking: `check_sql_injection` with `{'code': '...'}`
> 发现 1 处疑似 SQL 注入：f"SELECT * FROM users WHERE name='{username}'"...
> Invoking: `check_hardcoded_secrets` with `{'code': '...'}`
> 发现硬编码凭据：DATABASE_URL = "mysql://admin:MyP@ss...
> 审计完成。发现 2 个漏洞：
> 1. [严重] CWE-89 SQL 注入（auth.py:47）
> 2. [严重] CWE-798 硬编码凭据（auth.py:12）
```

### 3.3 与纯 Python ReAct 循环对比

| 维度 | 纯 Python ReAct | LangChain AgentExecutor |
|------|----------------|------------------------|
| 循环控制 | 手写 `while True` | 框架自动 |
| Tool 结果注入 | 手动 append message | 自动 |
| 上下文管理 | 手动截断 | 可配置 |
| 错误恢复 | 手动 try/except | 内置重试 |
| 最大迭代 | 手动计数器 | `max_iterations` 参数 |
| 工具绑定 | 手动 JSON Schema | `bind_tools()` |

**一句话总结**：LangChain 帮你省了"循环控制 + 上下文管理 + 错误处理"这些胶水代码，让你专注于工具定义和业务逻辑。

### 3.4 错误处理：Fallback 机制

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# 主模型 + 备用模型
primary_llm = ChatOpenAI(model="gpt-4o")
fallback_llm = ChatAnthropic(model="claude-sonnet-4-20250514")

# with_fallbacks：主模型失败时自动切换到备用模型
robust_llm = primary_llm.with_fallbacks([fallback_llm])

# 工具也可以设置 fallback
@tool
def search_web_fallback(query: str) -> str:
    """备用搜索工具"""
    return "备用搜索结果..."

# 在 AgentExecutor 中配置错误恢复
executor = AgentExecutor(
    agent=agent,
    tools=tools,
    handle_parsing_errors=True,  # 自动处理工具调用解析错误
    max_iterations=10
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
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

audit_prompt = ChatPromptTemplate.from_messages([
    ("system", """你是资深代码安全审计专家，精通 OWASP Top 10 和 CWE 标准。

审计流程：
1. 使用 read_file 读取目标文件
2. 依次使用 check_sql_injection、check_hardcoded_secrets、check_xss 检测漏洞
3. 对每个发现，给出完整的审计报告

输出格式要求：
- 每个漏洞包含：漏洞名称、CWE 编号、严重等级、文件位置、代码片段、攻击场景、修复代码
- 按严重等级排序（严重 > 高危 > 中危 > 低危）
- 最后给出审计摘要"""),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}")
])

tools = [read_file, check_sql_injection, check_hardcoded_secrets, check_xss]
llm = ChatOpenAI(model="gpt-4o", temperature=0)

agent = create_tool_calling_agent(llm, tools, audit_prompt)
audit_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=15
)
```

### 4.5 运行审计

```python
result = audit_executor.invoke({
    "input": "审计 ./src/api/auth.py 的安全性，生成完整审计报告"
})
print(result["output"])
```

**运行日志**：

```
> Entering new AgentExecutor chain...
> Invoking: `read_file` with `{'path': './src/api/auth.py'}`
> [返回文件内容]
> Invoking: `check_sql_injection` with `{'code': '...'}`
> 行 47：f-string 拼接 SQL
>   query = f"SELECT * FROM users WHERE username='{username}'"
> Invoking: `check_hardcoded_secrets` with `{'code': '...'}`
> 行 12：数据库连接串含明文密码
>   DATABASE_URL = "mysql://admin:MyP@ssw0rd123@localhost:3306/shopx"
> Invoking: `check_xss` with `{'code': '...'}`
> 未发现 XSS 风险

审计报告生成完成：
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

```markdown
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
```

---

## 五、流式输出与批处理

### 5.1 流式输出：实时显示审计进度

```python
# stream：逐 Token 输出审计结果
for chunk in audit_executor.stream({
    "input": "审计 ./src/api/auth.py"
}):
    # chunk 包含每个节点的输出
    if "agent" in chunk:
        print(chunk["agent"]["messages"][-1].content, end="", flush=True)
```

### 5.2 批处理：审计多个文件

```python
import glob

# 获取目录下所有 Python 文件
py_files = glob.glob("./src/api/**/*.py", recursive=True)

# 批量审计
audit_tasks = [
    {"input": f"审计 {f} 的安全性，列出所有漏洞"}
    for f in py_files
]

# batch：并发审计多个文件
results = audit_executor.batch(audit_tasks)

# 汇总结果
for task, result in zip(audit_tasks, results):
    print(f"\n{'='*50}")
    print(f"文件：{task['input']}")
    print(result["output"])
```

### 5.3 异步并发审计

```python
import asyncio

async def audit_all_files():
    # 异步批量审计
    results = await audit_executor.abatch(audit_tasks)
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
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-api-key"
os.environ["LANGCHAIN_PROJECT"] = "code-audit-agent"

# 代码完全不用改——LangChain 自动检测环境变量并上报
audit_executor.invoke({"input": "审计 auth.py"})
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
| Fallback 模型 | `primary_llm.with_fallbacks([fallback_llm])` 防止单点故障 |
| 成本追踪 | 在 AgentExecutor 外层包装 CostTracker（参考 DeepAgents 文章） |
| 错误重试 | `handle_parsing_errors=True` 自动处理工具调用解析错误 |
| 超时控制 | `max_execution_time=120` 防止单次审计超时 |
| 最大迭代 | `max_iterations=15` 防止无限循环 |
| 沙箱执行 | 审计不可信代码时，使用 Docker 沙箱隔离 |

### 6.4 从 LangChain 到 LangGraph

LangChain 的 `AgentExecutor` 是**单 Agent 串行执行**。当你需要：
- 多个 Agent 并行扫描不同目录
- Supervisor 统一调度专业 Agent
- 审计中途暂停等待人工确认

——就需要 **LangGraph** 来编排。

[下一篇](/blog/2026/07/langgraph-quick-intro/)将用 LangGraph 构建一个**多 Agent 代码审计系统**：Supervisor + Searcher + Auditor + Reporter，支持 Human-in-the-Loop 和状态持久化。

---

> **选型总结**：
> - **单文件审计**（工具调用 + RAG）→ LangChain 足够
> - **多目录并行审计**（多 Agent 编排）→ LangGraph
> - **完整项目审计**（预装一切）→ DeepAgents
