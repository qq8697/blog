# Agent 开发主流技术路线 博文计划

## Context

已有两篇 Agent 博文：概念篇（WHAT）和开发篇（HOW，框架无关）。现在需要**技术路线篇**——2026 年 Agent 开发的主流技术栈、选型策略和范式转变。

## 叙事主线

2026 年的 Agent 开发发生范式转变：**从"选框架写代码"到"组合 Skills + MCP + Rules + LLM"**。

---

## 九章节结构

### 引言：2026 年，Agent 开发变了

### 一、2026 年 Agent 技术栈全景图
核心四层架构：配置与指令层 → 工具与接口层 → 编排与执行层 → 模型与推理层。附 2024 vs 2026 对比表。

### 二、Skills + Rules + Hooks：配置驱动开发
Skills（流程级指令）、Rules（约束边界）、Hooks（安全网）。三者关系：Skills 告诉"怎么做"，Rules 告诉"什么不能做"，Hooks 在行动时"自动检查"。

### 三、MCP + Computer Use：统一工具接口
MCP 已是事实标准（2000+ 公共 Server，四大厂商全部支持），Computer Use 填补"无 API 系统"的空白。

### 四、IDE 进化：三种开发范式
智能补全（Copilot）→ Agent IDE（Cursor）→ 终端 Agent（Claude Code）。三者互补而非替代。

### 五、上下文工程：核心能力
Context Engineering 取代 Prompt Engineering 成为 2026 年 Agent 开发的核心技能。精选 > 堆量，分层注入，动态裁剪。

### 六、多 Agent 编排
Supervisor / Swarm / Handoff / DAG 四种模式，Subagent 是当前最佳实践。

### 七、Harness Engineering：从 Demo 到生产
七大领域：权限控制、上下文管理、工具调度、错误恢复、成本控制、可观测性、人工介入。

### 八、技术选型指南
7 种场景的推荐技术栈（个人/团队/企业/多Agent/非开发者/代码审查/CI/CD）。

### 九、2026 年入行学习路线（6 周计划）

---

## 与已有文章的关系

- 概念篇 → WHAT（14 个核心概念）
- 开发篇 → HOW（框架无关通用模式）
- **技术路线篇 → WHICH & WHY**（主流技术栈选型与趋势）

三篇形成完整学习路径：**先知道是什么 → 再学会怎么做 → 最后了解当前该用什么**。

## 文章元数据

```
title: Agent 开发主流技术路线 — 2026 年从入门到生产的技术选型指南
date: 2026-06-30
categories: [技术, AI]
tags: [Agent, Agent开发, MCP, Skills, 上下文工程, 技术路线, AI入门, 2026]
```