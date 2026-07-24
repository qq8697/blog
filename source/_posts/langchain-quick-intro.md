---
title: LangChain 快速入门
date: 2026-06-24 12:00:00
categories:
  - 技术
  - AI
tags:
  - Agent开发
  - LangChain
  - RAG
  - Python
  - LangSmith
---

> 本文是 Agent 开发系列的第三篇。前两篇分别讲了 [Agent 概念入门](/blog/2026/06/agent-quick-intro/) 和 [纯 Python 从零实现 Agent](/blog/2026/06/agent-dev-quick-intro/)。本篇切换到框架视角，介绍 LangChain 如何把 LLM 调用、工具、检索、输出解析统一为可组合的组件。下一篇 [LangGraph 快速入门](/blog/2026/06/langgraph-quick-intro/) 将在此基础上引入图编排。

---

## 一、LangChain 是什么

### 1.1 一句话定位

**LangChain 是 LLM 应用的"标准库"**——把大模型调用、Prompt 模板、工具定义、文档检索、输出解析统一为可组合的组件，让你不用每次都从零写胶水代码。

如果你用纯 Python 写 Agent（参考[上一篇](/blog/2026/06/agent-dev-quick-intro/)），需要自己处理：
- OpenAI / Anthropic API 的调用封装
- JSON Schema 工具定义
- ReAct 循环控制
- 流式输出、批处理
- 错误重试与 Fallback

LangChain 把这些全部抽象成了**统一接口**，每个环节都是可插拔的组件。

### 1.2 LangChain 在 Agent 生态中的位置

```
LangChain（组件层）→ LangGraph（编排层）→ LangSmith（可观测层）→ DeepAgents（电池全装好的底盘）
```

| 层 | 职责 | 本文覆盖 |
|----|------|---------|
| LangChain | LLM 调用、Prompt、Tool、Retriever 等标准组件 | 本篇 |
| LangGraph | 用状态图编排 Agent Loop 和多 Agent 协作 | 下一篇 |
| LangSmith | Trace、评估、监控 | 第六章速查 |
| DeepAgents | 预装文件系统、子 Agent、上下文压缩 | 再下一篇 |

### 1.3 2026 年架构变化

LangChain 已经从"大一统包"拆分为模块化架构：

| 包名 | 职责 |
|------|------|
| `langchain-core` | 抽象接口层：Runnable、ChatModel、Tool 等基类定义 |
| `langchain` | 实现层：Chain、Agent、Retriever 等组合逻辑 |
| `langchain-openai` | OpenAI 模型适配（GPT-4o、o1 等） |
| `langchain-anthropic` | Anthropic 模型适配（Claude 等） |
| `langchain-community` | 社区贡献的集成（向量库、Loader 等） |

### 1.4 安装

```bash
pip install langchain langchain-openai langchain-community
# 可选：向量库
pip install faiss-cpu chromadb
```

当前版本：`langchain` v0.3.x（2026 年 6 月）。

---

## 二、核心抽象层（langchain-core）

LangChain 的一切组件都实现了 **Runnable 接口**，这是整个框架的基石。

### 2.1 Runnable 接口

每个 LangChain 组件（LLM、Prompt、Parser、Retriever、Tool）都实现了四个方法：

| 方法 | 说明 |
|------|------|
| `invoke(input)` | 同步调用，输入 → 输出 |
| `ainvoke(input)` | 异步调用 |
| `batch(inputs)` | 批量调用 |
| `stream(input)` | 流式输出 |

这意味着：写一个组件，自动获得同步/异步/批量/流式四种运行模式——不需要手动实现。

### 2.2 ChatModel：LLM 调用标准接口

```python
from langchain_openai import ChatOpenAI

# 创建模型（替代直接调 openai SDK）
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# invoke：最简单的调用
response = llm.invoke("什么是 Agent？")
print(response.content)  # "Agent 是一个能感知环境并自主行动的智能体..."

# stream：流式输出
for chunk in llm.stream("用三句话解释 Agent"):
    print(chunk.content, end="", flush=True)

# ainvoke：异步调用（适合并发场景）
import asyncio
response = await llm.ainvoke("什么是 ReAct？")
```

**与纯 Python 调 OpenAI 的对比**：

| 维度 | 纯 Python（openai SDK） | LangChain ChatModel |
|------|------------------------|---------------------|
| 切换模型 | 改代码（不同 SDK） | 换实例（`ChatOpenAI` → `ChatAnthropic`） |
| 流式输出 | 手动处理 `stream` 响应 | `.stream()` 一行搞定 |
| 异步 | 用 `AsyncOpenAI` | `.ainvoke()` |
| 批量 | 手动循环 | `.batch()` 自动并发 |

### 2.3 PromptTemplate：参数化提示词

```python
from langchain_core.prompts import ChatPromptTemplate

# 创建模板
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个{role}，请用{style}的风格回答问题。"),
    ("human", "{question}")
])

# invoke：传入参数，生成完整 Prompt
messages = prompt.invoke({
    "role": "安全专家",
    "style": "简洁专业",
    "question": "什么是 SQL 注入？"
})
print(messages)  # [SystemMessage(...), HumanMessage(...)]
```

### 2.4 OutputParser：结构化输出

```python
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

class SecurityIssue(BaseModel):
    severity: str = Field(description="严重程度：高/中/低")
    description: str = Field(description="问题描述")
    fix: str = Field(description="修复建议")

parser = PydanticOutputParser(pydantic_object=SecurityIssue)

# 将解析指令注入 Prompt
prompt_with_parser = ChatPromptTemplate.from_messages([
    ("system", "你是代码安全专家。{format_instructions}"),
    ("human", "审计这段代码：{code}")
])

messages = prompt_with_parser.invoke({
    "code": "query = f'SELECT * FROM users WHERE id={user_input}'",
    "format_instructions": parser.get_format_instructions()
})

# LLM 返回 JSON → 自动解析为 Pydantic 对象
response = llm.invoke(messages)
issue = parser.parse(response.content)
print(issue.severity)   # "高"
print(issue.fix)        # "使用参数化查询..."
```

### 2.5 Tool / @tool 装饰器

```python
from langchain_core.tools import tool

@tool
def search_code(keyword: str) -> str:
    """在代码库中搜索包含关键词的文件"""
    # 实际实现
    return f"找到 3 个文件包含 '{keyword}': auth.py, db.py, api.py"

# Tool 对象自动生成 JSON Schema
print(search_code.name)          # "search_code"
print(search_code.description)   # "在代码库中搜索包含关键词的文件"
print(search_code.args_schema)   # Pydantic schema
```

**与纯 Python 版 JSON Schema 对比**：

| 维度 | 纯 Python | LangChain @tool |
|------|----------|----------------|
| Schema 定义 | 手写 JSON Schema 字典 | docstring + 类型注解自动生成 |
| 参数校验 | 手动 | Pydantic 自动校验 |
| 错误处理 | 手动 try/except | 框架包装 |

---

## 三、链（Chain）与 LCEL

**LCEL（LangChain Expression Language）** 是 LangChain 的组合语言——用 `|` 管道符把 Runnable 组件串联成链。

### 3.1 最简单的链

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 定义组件
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个技术专家，用三句话解释概念。"),
    ("human", "{topic}")
])
llm = ChatOpenAI(model="gpt-4o", temperature=0)
parser = StrOutputParser()

# LCEL：用 | 组合成链
chain = prompt | llm | parser

# 运行
result = chain.invoke({"topic": "什么是 Agent？"})
print(result)  # "Agent 是一个能感知环境并自主行动的智能体..."

# 同一个链，自动支持流式
for chunk in chain.stream({"topic": "什么是 RAG？"}):
    print(chunk, end="", flush=True)

# 批量处理
results = chain.batch([
    {"topic": "什么是 Token？"},
    {"topic": "什么是 MCP？"},
])
```

**链 vs 纯 Python 函数**：

```python
# 纯 Python 写法（命令式）
def explain(topic: str) -> str:
    messages = [("system", "..."), ("human", topic)]
    response = client.chat.completions.create(model="gpt-4o", messages=messages)
    return response.choices[0].message.content

# LCEL 写法（声明式）
chain = prompt | llm | parser  # 一行定义，自动获得 stream/batch/async
```

### 3.2 高阶组件

| 组件 | 用途 |
|------|------|
| `RunnableLambda` | 把普通 Python 函数包装为 Runnable |
| `RunnablePassthrough` | 透传输入（常用于 `assign` 添加字段） |
| `RunnableParallel` | 并行执行多个 Runnable，合并结果 |
| `RunnableBranch` | 条件分支（类似 if/else） |

```python
from langchain_core.runnables import RunnableParallel, RunnableLambda

# RunnableParallel：并行执行
parallel_chain = RunnableParallel(
    summary=chain,  # 生成摘要
    keywords=RunnableLambda(lambda x: extract_keywords(x["topic"]))
)
result = parallel_chain.invoke({"topic": "什么是 Agent？"})
# result = {"summary": "Agent 是...", "keywords": ["Agent", "AI", ...]}
```

### 3.3 带检索的链（RAG 模式预览）

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate

# 假设 retriever 已定义（第五章详解）
rag_prompt = ChatPromptTemplate.from_messages([
    ("system", "根据以下参考资料回答问题：\n{context}"),
    ("human", "{question}")
])

# RAG 链：检索 → 注入上下文 → LLM 生成
rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | rag_prompt
    | llm
    | StrOutputParser()
)

answer = rag_chain.invoke("LangChain 的核心接口是什么？")
```

### 3.4 错误处理与 Fallback

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# 主模型 + 备用模型
primary_llm = ChatOpenAI(model="gpt-4o")
fallback_llm = ChatAnthropic(model="claude-sonnet-4-20250514")

# with_fallbacks：主模型失败时自动切换到备用模型
robust_llm = primary_llm.with_fallbacks([fallback_llm])

chain = prompt | robust_llm | StrOutputParser()
# 如果 OpenAI API 超时，自动使用 Anthropic
```

---

## 四、工具调用与 Agent

### 4.1 Tool Calling 机制

LangChain 的 Tool Calling 利用模型原生的 function calling 能力：

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

@tool
def get_weather(city: str) -> str:
    """获取指定城市的天气信息"""
    # 实际调用天气 API
    weather_data = {"北京": "晴 28°C", "上海": "多云 25°C"}
    return weather_data.get(city, f"{city}：未知")

@tool
def calculate(expression: str) -> str:
    """计算数学表达式"""
    return str(eval(expression))

# 绑定工具到模型
llm = ChatOpenAI(model="gpt-4o")
llm_with_tools = llm.bind_tools([get_weather, calculate])

# 模型会根据用户问题决定是否调用工具
response = llm_with_tools.invoke("北京今天天气怎么样？")
print(response.tool_calls)
# [{"name": "get_weather", "args": {"city": "北京"}, "id": "call_xxx"}]
```

### 4.2 构建完整 Agent

LangChain 提供了 `create_tool_calling_agent()` 快速构建 Agent：

```python
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

# 定义工具
@tool
def search_web(query: str) -> str:
    """搜索互联网获取信息"""
    return f"搜索结果：关于 '{query}' 的最新信息..."

@tool
def calculate(expression: str) -> str:
    """计算数学表达式"""
    return str(eval(expression))

# 创建 Prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个智能助手，可以使用工具来帮助用户。"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}")  # Agent 的思考过程
])

# 创建 Agent
llm = ChatOpenAI(model="gpt-4o")
agent = create_tool_calling_agent(llm, [search_web, calculate], prompt)

# 包装为 Executor（负责运行 Agent 循环）
executor = AgentExecutor(agent=agent, tools=[search_web, calculate], verbose=True)

# 运行
result = executor.invoke({"input": "帮我计算 123 * 456，然后搜索 Python 最新版本"})
print(result["output"])
```

**AgentExecutor 的 verbose 模式会打印每一步**：

```
> Entering new AgentExecutor chain...
> Invoking: `calculate` with `{'expression': '123 * 456'}`
> 56088
> Invoking: `search_web` with `{'query': 'Python 最新版本'}`
> 搜索结果：Python 3.13 已于 2024 年 10 月发布...
> Python 3.13 是最新版本，123 * 456 = 56088。
```

### 4.3 与纯 Python ReAct 循环对比

| 维度 | 纯 Python ReAct | LangChain AgentExecutor |
|------|----------------|------------------------|
| 循环控制 | 手写 `while True` | 框架自动 |
| Tool 结果注入 | 手动 append message | 自动 |
| 上下文管理 | 手动截断 | 可配置 |
| 错误恢复 | 手动 try/except | 内置重试 |
| 工具绑定 | 手动 JSON Schema | `bind_tools()` |

**一句话总结**：LangChain 帮你省了"循环控制 + 上下文管理 + 错误处理"这些胶水代码，让你专注于工具定义和业务逻辑。

---

## 五、RAG（检索增强生成）实战

RAG 是 LangChain 最经典的应用场景之一。完整流程：**Load → Split+Embed → Retrieve → Generate**。

### 5.1 Document Loader

```python
from langchain_community.document_loaders import TextLoader, PyPDFLoader, WebBaseLoader

# 加载 Markdown 文件
loader = TextLoader("./docs/guide.md", encoding="utf-8")
docs = loader.load()  # 返回 List[Document]

# 加载 PDF
pdf_loader = PyPDFLoader("./docs/manual.pdf")
pdf_docs = pdf_loader.load()

# 加载网页
web_loader = WebBaseLoader("https://python.langchain.com/docs/")
web_docs = web_loader.load()
```

### 5.2 Text Splitter：分块

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # 每块最大字符数
    chunk_overlap=200,    # 块之间的重叠（保持上下文）
    separators=["\n\n", "\n", "。", " ", ""]  # 按优先级分割
)

chunks = splitter.split_documents(docs)
print(f"原始文档数: {len(docs)}, 分块后: {len(chunks)}")
```

### 5.3 Embedding + Vector Store

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

# 创建 Embedding 模型
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 创建向量库（FAISS 是本地内存向量库）
vectorstore = FAISS.from_documents(chunks, embeddings)

# 创建 Retriever
retriever = vectorstore.as_retriever(
    search_type="mmr",    # MMR：最大边际相关性，减少重复结果
    search_kwargs={"k": 4}  # 返回最相关的 4 个文档块
)

# 测试检索
results = retriever.invoke("LangChain 的核心接口是什么？")
for doc in results:
    print(doc.page_content[:100] + "...")
```

### 5.4 完整 RAG 链

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Prompt：注入检索结果
rag_prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个知识库助手。根据以下参考资料回答问题，如果资料不足请说明。\n\n参考资料：\n{context}"),
    ("human", "{question}")
])

# 格式化检索结果
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# RAG 链
rag_chain = (
    {
        "context": retriever | format_docs,
        "question": RunnablePassthrough()
    }
    | rag_prompt
    | ChatOpenAI(model="gpt-4o", temperature=0)
    | StrOutputParser()
)

# 提问
answer = rag_chain.invoke("LangChain 的 Runnable 接口有哪些方法？")
print(answer)
```

### 5.5 生产考量

| 维度 | 建议 |
|------|------|
| 分块大小 | 500-1500 字符，根据文档类型调整 |
| 重叠 | 10-20%，保持上下文连贯 |
| Embedding 模型 | `text-embedding-3-small`（便宜）或 `text-embedding-3-large`（更准） |
| 检索数量 | 3-6 个块，太多会稀释上下文 |
| 向量库 | FAISS（本地）/ Chroma（轻量持久化）/ Pinecone/Weaviate（生产级） |

---

## 六、LangSmith 可观测性（速查）

### 6.1 LangSmith 是什么

**LangSmith 是 LLM 应用的"调试器 + 日志系统 + 评估平台"**。

当你的 Chain/Agent 出了问题，LangSmith 可以帮你：
- **Trace**：查看每次 LLM 调用的完整链路（输入、输出、耗时、Token 消耗）
- **Dataset**：建立评估数据集，自动化测试
- **Evaluation**：对比不同 Prompt/模型的效果

### 6.2 零代码集成

只需设置环境变量，LangChain 自动上报 Trace：

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY="your-api-key"
export LANGCHAIN_PROJECT="my-agent-project"
```

Python 代码**完全不用改**——LangChain 的组件会自动检测环境变量并上报。

### 6.3 Trace 示例

一次 Agent 调用的 Trace 会展示：

```
📊 Trace: "帮我计算 123 * 456，然后搜索 Python 最新版本"
├── 🤖 LLM Call (gpt-4o)        | 1.2s | 150 tokens
│   └── 决定调用 calculate 工具
├── 🔧 Tool: calculate("123*456") | 0.01s
│   └── 返回 "56088"
├── 🤖 LLM Call (gpt-4o)        | 0.8s | 120 tokens
│   └── 决定调用 search_web 工具
├── 🔧 Tool: search_web(...)      | 2.1s
│   └── 返回 "Python 3.13..."
└── 🤖 LLM Call (gpt-4o)        | 0.5s | 80 tokens
    └── 生成最终回答
```

### 6.4 生产价值

| 场景 | LangSmith 价值 |
|------|---------------|
| 故障定位 | 快速定位是哪个 Tool 调用失败或超时 |
| 成本分析 | 统计每个 Chain 的 Token 消耗和 API 调用次数 |
| 回归测试 | 建立 Dataset，每次改 Prompt 后自动评估 |
| 性能优化 | 发现慢节点，针对性优化 |

---

> **下一篇**：[LangGraph 快速入门](/blog/2026/06/langgraph-quick-intro/) 将介绍如何用"状态图"编排 Agent——把 Agent Loop 表达为节点 + 边 + 状态，支持循环、分支、多 Agent 协作。
