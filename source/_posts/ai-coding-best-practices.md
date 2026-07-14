---
title: AI Coding 最佳实践快速入门
date: 2026-07-03 14:00:00
categories:
  - 技术
  - AI
tags:
  - AI Coding
  - Superpowers
  - TDD
  - Loop工程
---


AI 让代码的生成从“稀缺“变得“泛滥“，这意味着代码的验证、审查变得更加困难，系统"看起来对，跑起来炸"变成常态。问题不在 AI，而在于**缺少工程规范**。这篇文章介绍 2026 年 AI Coding 的工程化最佳实践——从"一句话需求直接写代码"到"Spec → Plan → Execute → Review 闭环工程"。

核心公式：**需求规格化 → 任务计划化 → 执行自动化 → 验证标准化**。

---

## 一、AI Coding 的核心挑战与进化路径

### 1.1 为什么 AI 写的代码经常"跑起来炸"？

AI 写代码有三个核心痛点，每个都致命：

| 痛点 | 表现 | 后果 |
|------|------|------|
| **缺乏设计** | 直接写代码，不先想清楚"到底要做什么" | 架构混乱、难以扩展 |
| **缺乏计划** | 跳跃式开发，想到哪写到哪 | 文件间不协调，接口对不上 |
| **缺乏验证** | 写完就算，不测试、不审查 | 看起来对，跑起来炸 |

这三个痛点对应一个缺失——**工程规范**。解决方案就是四阶段公式：

```
需求规格化 → 任务计划化 → 执行自动化 → 验证标准化
```

### 1.2 AI Coding 进化路径

AI Coding 不是一蹴而就的，它经历了四个阶段：

```
原始 Vibe Coding
  用户 → 一句话需求 → AI 直接写代码 → 逐步调优
  问题：缺乏设计、缺乏计划、缺乏验证

+ Spec（先约定再执行）+ Plan（想清楚再动手）
  用户 → Spec（需求对齐）→ Plan（任务拆解）→ AI 按计划执行
  效果：质量和可控性显著提升

+ Superpowers（强制走流程）
  用户 → 自动触发 Brainstorm → Plan → TDD → Review
  效果：工程级质量，每个环节有门禁

+ Loop Engineering（闭环自动化）
  用户设定目标 → AI 自主循环：行动 → 检查 → 调整 → 继续
  效果：持续交付，AI 自主迭代优化
```

**当前你在哪一阶段？** 大多数开发者还在 Vibe Coding 和 Spec+Plan 之间。这篇文章的目标是带你走到 Superpowers 阶段，并理解 Loop Engineering 的方向。

---

## 二、Superpowers 是什么

**Superpowers** 是由 Jesse Vincent（obra）创建的开源 **Agentic Skills 框架**。它不是一个 IDE 插件，也不是一个平台——而是一组**强制性的软件开发方法论 + 可组合的 Skills 技能包**。

### 2.1 定位

```
Superpowers = 你的 AI 编程工具 + 强制性工程流程
```

它不改变你用什么 IDE 或 AI 工具，而是改变**你与 AI 协作的方式**：从"你指挥 AI 写代码"变成"AI 按工程流程自动推进"。


### 2.2 核心理念

| 理念 | 含义 | 在 Superpowers 中的体现 |
|------|------|----------------------|
| **TDD** | 测试驱动开发 | 每个任务必须先写失败测试，再写实现 |
| **YAGNI** | You Aren't Gonna Need It | Spec 阶段只设计当前需要的，不提前设计 |
| **DRY** | Don't Repeat Yourself | Skills 复用，不重复写相同的指令 |
| **小步快跑** | 每个任务 2-5 分钟可完成 | Plan 阶段强制拆分为小任务 |

它通过 Skills（技能包） 的形式，强制你的 AI 在写代码前走流程：
- 先头脑风暴出 Spec → 再拆解成 Plan → 再按 TDD 执行 → 最后自动 Review
- 每个 Skill 会在合适的时机自动触发，你不需要手动调用

### 2.3 安装（以 Claude Code 为例）

```bash
# 克隆 Superpowers 仓库
git clone https://github.com/obra/superpowers.git ~/.superpowers

# 在 Claude Code 中启用（将 skills 目录链接到项目）
cd your-project
mkdir -p .claude
ln -s ~/.superpowers/skills .claude/skills
```

> 不同工具的配置方式不同，具体请参考 [Superpowers 官方仓库](https://github.com/obra/superpowers) 的安装说明。

安装后，Claude Code 启动时会自动加载 Superpowers 的 Skills，包括 Brainstorming、Writing Plans、TDD、Code Review 等。

---

## 三、Superpowers 怎么干

### 3.1 Brainstorming：头脑风暴 → Spec

传统方式：你给 AI 一句话需求，AI 直接写代码。

Superpowers 方式：你给出需求方向，AI **不写代码**，而是先和你讨论：

```
你：我想做一个用户登录功能

AI（Brainstorming 模式）：
  好的，我先不写代码。让我们讨论一下需求：
  1. 认证方式：用户名密码？邮箱？手机号？OAuth？
  2. 会话管理：JWT 还是 Session？
  3. 安全要求：是否支持 MFA？登录失败锁定？
  4. 边界情况：多次失败锁定、密码重置、记住我...
  
  我建议分几个模块讨论，你觉得呢？
```

AI 会产出**结构化的 Spec 文档**，分块展示，等你逐块确认。**你不确认，AI 不进入下一步**。

### 3.2 Writing Plans：写计划 → Plan

Spec 确认后，AI 产出**详细实现计划**。每个任务满足：

- **2-5 分钟可完成**（太大就继续拆；包含 AI 生成代码 + 验证时间）
- **只涉及 1-2 个文件**（确保任务足够小、足够独立）
- **精确到文件路径**（`src/auth/login.ts`，不是"auth 模块"）
- **包含完整可运行代码**（不是伪代码，是可直接运行的代码）
- **包含验证步骤**（怎么跑测试、怎么确认完成）

示例 Plan：

```markdown
## Task 1: 创建数据库模型
- 文件：`src/models/user.ts`
- 内容：User 模型，包含 id/username/password_hash/created_at
- 验证：`npm test -- models/user.test.ts`

## Task 2: 实现密码哈希
- 文件：`src/utils/crypto.ts`
- 内容：hashPassword() / verifyPassword()，使用 bcrypt
- 验证：`npm test -- utils/crypto.test.ts`

## Task 3: 实现登录 API
- 文件：`src/api/auth.ts`
- 内容：POST /login，接收 username+password，返回 JWT
- 验证：`curl -X POST localhost:3000/login -d '{"username":"test","password":"123"}'`
```

### 3.3 Subagent-Driven Development：子 Agent 执行

Plan 确认后，AI 对每个任务启动一个**独立的子 Agent** 来执行。每个子 Agent：

- 拥有独立的上下文窗口（不受其他任务干扰）
- 经过两阶段审查：
  1. **Spec 合规检查**：代码是否符合 Spec 的设计？
  2. **代码质量检查**：是否符合 TDD 要求？是否有测试？

多个子 Agent 可以**并行执行**。

> **注意**：子 Agent 并行执行需要工具支持。Claude Code 和 Cursor 原生支持任务委派；如果需要真正的并行执行，需要配合多 Agent 框架（如 LangGraph、CrewAI）。

### 3.4 Test-Driven Development：测试驱动开发

Superpowers 强制每个任务走 TDD 流程：

```
RED   → 先写失败测试
GREEN → 写最小代码让测试通过
REFACTOR → 重构优化，保持测试绿色
```

**TDD 不可跳过**——没写测试，任务不算完成。这是 Superpowers 最核心的约束。

> **说明**：在探索性开发或 UI 原型阶段，可以先用"写代码 + 补测试"的方式快速迭代，待方案稳定后再严格走 TDD。但**功能开发的最终交付必须包含测试**。

### 3.5 Code Review：代码审查


每个任务完成后，AI 自动进行代码审查：

| 审查维度 | 检查内容 |
|---------|---------|
| **Spec 合规** | 代码是否实现了 Spec 中的所有要求？ |
| **Plan 合规** | 文件路径、函数签名是否与 Plan 一致？ |
| **测试覆盖** | 是否有测试？测试是否通过？ |
| **代码规范** | 命名、结构、注释是否符合规范？ |
| **基础安全检查** | 是否有硬编码密钥、SQL 注入、明文密码等明显安全漏洞？ |

| 级别           | 行为        |
| ------------ | --------- |
| **Critical** | 阻塞进度，必须修复 |
| **Warning**  | 报告问题，建议修复 |
| **Info**     | 记录，不阻塞    |

**严重问题会阻塞进度**，直到修复为止。

### 3.6 Finishing：收尾

全部任务完成后：

1. 运行完整测试套件
2. 生成变更摘要
3. 选择：合并到主分支 / 创建 PR / 保留在分支 / 丢弃

---

## 四、Loop 工程：让 AI 持续正确地写代码

### 4.1 双层循环模型

Superpowers 的核心是**双层循环**：

```
外层循环（功能级）：Spec → Plan → Execute → Review → 交付
     ↑                                              |
     └──────────────────────────────────────────────┘

内层循环（任务级）：RED → GREEN → REFACTOR → 下一个任务
     ↑                              |
     └──────────────────────────────┘
```

**外层循环**保证方向正确，**内层循环**保证每个任务质量过关。

### 4.2 关键原则

| 原则 | 说明 |
|------|------|
| **小步快跑** | 每个任务 2-5 分钟，改完立即验证 |
| **每次循环可验证** | 每个循环结束必须有可运行的产物 |
| **Review 是门禁** | 审查不过，不进入下一步 |
| **失败隔离** | 一个任务失败不影响其他任务 |


### 4.3 Loop Engineering 的终极形态

当你把外层循环也自动化后，就进入了 Loop Engineering 阶段：

![AI coding 进化路径](/images/Gemini_Generated_Image_cb9wptcb9wptcb9w.png)

在 Loop Engineering 阶段，AI 不仅执行你指定的任务，还能：
- 发现测试失败后自动分析原因并修复
- 发现 Spec 不清晰时自动提出问题
- 在多个实现方案中自动选择最优解

**但核心不变**：AI 负责"执行"和"建议"，人负责"判断"和"决策"。

---

## 五、实战：用 Superpowers 从零构建一个功能

以构建一个"用户认证模块"为例，完整走一遍 Superpowers 流程。

### 5.1 启动 Claude Code + Superpowers

```bash
cd my-project
echo "superpowers" > .claude/skills
claude
```

### 5.2 Brainstorming：产出 Spec

```
👤 你：我需要一个用户认证模块，支持邮箱注册和登录

🤖 Claude（Brainstorming 模式）：
  好的，让我们先讨论需求，不写代码。

  第一块：注册流程
  - 用户输入邮箱和密码
  - 密码要求：至少 8 位，包含大小写字母和数字
  - 发送验证邮件，点击链接激活账号
  - 你觉得这个流程可以吗？

  👤 你：可以，但暂时不需要邮件验证，注册后直接可用

  🤖 Claude：明白。第二块：登录流程
  - 用户输入邮箱和密码
  - 验证通过后返回 JWT
  - 登录失败 5 次后锁定 15 分钟
  - 可以吗？

  👤 你：锁定改为 3 次失败后锁定 10 分钟
  ...

  🤖 Claude：确认完毕。以下是完整 Spec：
  [展示结构化 Spec 文档]
  
  👤 你：确认 ✓
```

### 5.3 Writing Plan：产出实现计划

```
🤖 Claude：基于 Spec，我来拆解为实现计划：

  Task 1：创建 User 模型（3 分钟）
    文件：src/models/user.ts
    验证：npm test -- models/user.test.ts

  Task 2：实现密码哈希工具（2 分钟）
    文件：src/utils/crypto.ts
    验证：npm test -- utils/crypto.test.ts

  Task 3：实现注册 API（4 分钟）
    文件：src/api/auth.ts
    验证：curl -X POST localhost:3000/register

  Task 4：实现登录 API（4 分钟）
    文件：src/api/auth.ts（追加）
    验证：curl -X POST localhost:3000/login

  Task 5：实现登录失败锁定（3 分钟）
    文件：src/middleware/rateLimit.ts
    验证：连续 3 次错误密码后第 4 次被拒绝

  确认后我开始执行。

  👤 你：确认 ✓
```

### 5.4 Execution：自动执行

```
🤖 Claude：开始执行 Task 1...

  [SubAgent-1] 创建 src/models/user.ts
  [SubAgent-1] 先写测试：src/__tests__/models/user.test.ts
  [SubAgent-1] RED：测试失败 ✓
  [SubAgent-1] 写实现代码
  [SubAgent-1] GREEN：测试通过 ✓
  [SubAgent-1] REFACTOR：代码结构优化
  [SubAgent-1] Task 1 完成 ✓

  [SubAgent-2] 开始 Task 2...
  [SubAgent-3] 开始 Task 3（并行）...
  ...
```

### 5.5 Review & Finish

```
🤖 Claude：全部 5 个任务完成。审查结果：

  Task 1 ✓  测试通过，Spec 合规
  Task 2 ✓  测试通过，Spec 合规
  Task 3 ✓  测试通过，Spec 合规
  Task 4 ✓  测试通过，Spec 合规
  Task 5 ⚠️  锁定时间实现为 15 分钟，Spec 要求 10 分钟
        → 需要人工确认：接受此偏差 / 要求修复

  👤 你：要求修复，按 Spec 改为 10 分钟
  
  🤖 Claude：已修复，重新验证通过 ✓

  全部测试通过（12/12）
  变更摘要：新增 5 个文件，修改 0 个文件

  要创建 PR 吗？

  👤 你：创建 PR
```

---

## 六、最佳实践总结

| 原则 | 为什么 | 反例 |
|------|--------|------|
| **永远先 Spec 再 Plan 再 Code** | 方向错了，写得越快错得越多 | "帮我写个登录功能"→ 直接写代码 |
| **每个任务 2-3 分钟** | 太大容易失控，太小效率低 | 一个任务拆成 50 个文件 |
| **TDD 不可跳过** | 没测试的代码 = 不可验证的代码 | 写完功能再加测试 |
| **Review 是门禁** | 审查不过不进下一步，防止问题累积 | Review 走过场，发现的问题"下次再改" |
| **小步提交** | 每完成一个任务就提交一次 | 写了一天代码，一次 commit 全部 |
| **子 Agent 委派** | 独立任务委派执行，效率翻倍 | 串行执行所有任务 |

### 常见反模式

| 反模式 | 表现 | 为什么有害 |
|--------|------|-----------|
| **Prompt 堆砌** | 在一个 prompt 里塞 5000 字需求 | AI 注意力分散，遗漏关键点 |
| **过度信任** | AI 说"完成了"就信，不验证 | 幻觉代码、逻辑漏洞 |
| **无版本控制** | 直接让 AI 修改生产代码 | 无法回滚，风险极高 |
| **跳过 Spec** | 需求不明确就开始写代码 | 方向错误，推倒重来 |

### 什么时候不适合用这套流程

这套流程虽然强大，但并非万能：

- **算法竞赛/面试题**：AI 可能给出复杂度过高的解，需要人工判断
- **安全关键系统**（医疗、金融核心）：必须人工主导，AI 辅助而非替代
- **遗留代码大规模重构**：上下文太大，AI 容易理解偏差，需分阶段推进
- **探索性原型**：严格 Spec 会束缚创造力，先用 Vibe Coding 快速验证，确定方向后再走流程

### Superpowers 的局限性

| 局限 | 说明 |
|------|------|
| **学习成本** | 从"直接写代码"到"先 Spec 再 Plan 再 Code"，需要适应期 |
| **流程刚性** | 对非常小的改动（如修一个 typo），严格走流程可能过于"重" |
| **需要人工判断** | Spec 确认、Review 否决、HITL 审批都需要人的参与，不是全自动 |

### 进化路径回顾

![AI coding 进化路径](/images/Gemini_Generated_Image_ntxieantxieantxi.png)

**你现在在哪一步？** 不管在哪，下一步都是往右走——从"写代码"变成"建流程"。


> **小结**：AI Coding 的核心不是"AI 有多聪明"，而是"你与 AI 的协作流程有多好"。四阶段公式——**需求规格化 → 任务计划化 → 执行自动化 → 验证标准化**——是贯穿始终的主线。Superpowers 把这条公式变成了强制执行的工程流程，Loop Engineering 是它的终极形态。