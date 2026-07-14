# Agent 概念快速入门 博文计划

## Context

写一篇面向 AI 新人的科普博文，以"AI 从聊天工具到能落地干活的数字员工"为叙事主线，系统梳理 Agent 生态的核心概念。按"从基础到高级、从说到做、从单次到持续"的进化顺序组织。

---

## 文章大纲

### 引言：AI 的进化——从聊天到干活

> 两年前，我们惊叹于 ChatGPT 能聊天。今天，AI 已经能自己读文件、调 API、操作电脑、自主拆任务执行——它不是"更会聊了"，而是"进化出了手脚"。这篇文章带你理清这背后的每一个关键概念。

---

### 一、基础：AI 怎么"识字"和"记事"

#### 1.1 Token — 文字的最小单元
LLM 处理文本的最小计量与计费单位。英文约 4 字符 ≈ 1 Token；中文约 1~2 字 ≈ 1 Token。API 费用、速率限制都以 Token 计算。

#### 1.2 Context Window — 单次处理的"记忆上限"
模型单次对话能"看到"的最大 Token 数量。200K Token ≈ 15 万中文字。窗口满了就失忆——需要上下文压缩（Compaction）。

**关系**：Token 是"最小单元"，Context Window 是"单次容量上限"。

---

### 二、指令：怎么让 AI 听懂需求

#### 2.1 Prompt — 指令话术
发给 LLM 的输入文本，三层结构：System Prompt（角色定义）+ User Prompt（具体任务）+ 历史回复。Prompt 就是你给 AI 的"工作说明书"。

#### 2.2 Context Engineering — 信息流管控
有意识地设计 Agent 每一轮能看到什么信息。好的上下文工程比换更强的模型更能提升表现。从"写提示词"到"管控信息流"的范式升级。

**关系**：Prompt 是"一句话指令"，Context Engineering 是"你给 AI 看的全部资料的编排策略"。

---

### 三、查证：怎么解决 AI 瞎编

#### 3.1 RAG — 检索增强生成
三步：检索（Retrieval）→ 增强（Augmented）→ 生成（Generation）。先查资料再回答，让 AI 基于真实文档而非训练记忆。

#### 3.2 向量数据库 — RAG 的检索引擎
文档切块 → 向量化存入 → 语义相似度搜索 → 检索 Top-K 片段 → 拼进 Prompt。搜"红烧肉"也能找到"红烧排骨"。

**关系**：RAG 是"方法论"，向量数据库是"核心引擎"。

---

### 四、行动：AI 从"说"到"做"

#### 4.1 Tool Calling — 函数调用
LLM 返回结构化 JSON 表达"我要调某某工具"，外层程序执行并反馈结果。模型只负责"做决定"，程序负责"真执行"。

#### 4.2 MCP — 模型上下文协议（AI 界的 USB-C）
Anthropic 开源的开放标准协议，解决 M×N 集成地狱。三个角色：Host（AI 应用）→ Client（协议组件）→ Server（包装外部工具）。2025年捐赠给 Linux 基金会。

#### 4.3 Computer Use — 像人一样操作电脑
AI 通过虚拟鼠标和键盘，直接操控屏幕上的应用。与 Tool Calling 的区别：Tool Calling 是"调 API"（结构化），Computer Use 是"看屏幕+操作 GUI"（通用）。

**关系**：Tool Calling 让 AI"调接口"，MCP 统一了标准，Computer Use 更进一步——没有 API 也能操控。

---

### 五、沉淀：把重复工作流程化

#### 5.1 Skill — 技能包
存放在 SKILL.md 中的 Markdown 指令包，教 Agent 如何完成特定任务。Prompt 是"一次性指令"，Skill 是"可复用的流程级指令包"。类比：菜谱 vs 每次口头教做菜。

---

### 六、自主：AI 能自己拆任务执行

#### 6.1 Agent — 智能体
核心公式：Agent = Model（智力）+ Harness（手脚+流程）。核心循环：观察 → 规划 → 行动 → 验证 → 重复。Agent 的本质——所有不需要智能的部分拼在一起，给中间那个真正需要智能的 LLM 打工。

---

### 七、落地：控风险、串流程、长期运行

#### 7.1 Harness — 执行框架 / 安全外壳
包裹在 LLM 外面的整套软件基础设施。核心职责：权限控制（7 层纵深防御）、上下文管理（自动压缩）、工具调度（并发安全）。

#### 7.2 Workflow — 工作流
把多步骤任务编排成可重复、有顺序的流程。与 Agent 区别：Agent 是"自主规划"，Workflow 是"步骤固定但每步可调用 LLM"。

#### 7.3 Workspace Agent — 长期数字员工
能持续运行、跨会话保持上下文、拥有持久记忆的 Agent。普通 Agent 是"一次性临时工"，Workspace Agent 是"长期员工"。

---

### 八、总结：AI 进化全景图

```
基础层   Token + Context Window        （识字识数）
  ↓
指令层   Prompt + Context Engineering   （听懂需求）
  ↓
查证层   RAG + 向量数据库               （不再瞎编）
  ↓
行动层   Tool Calling + MCP + Computer Use （从说到做）
  ↓
沉淀层   Skill                          （流程复用）
  ↓
自主层   Agent                          （独立干活）
  ↓
落地层   Harness + Workflow + Workspace Agent （生产可靠）
```

---

## 文章元数据

```
title: Agent 概念快速入门 — AI 从聊天工具到数字员工的进化史
date: 2026-06-26
categories:
  - 技术
  - AI
tags:
  - Agent
  - AI入门
  - Token
  - Prompt
  - RAG
  - MCP
  - Tool Calling
  - Skill
  - Workflow
  - 人工智能
```