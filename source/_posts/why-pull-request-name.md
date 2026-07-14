---
title: 为什么新的代码更改叫 Pull Request？
date: 2026-05-20 10:00:00
categories:
  - 技术
  - Git
tags:
  - Git
  - GitHub
  - Pull Request
  - 版本控制
  - 代码协作
---

在 GitHub、GitLab 等平台上，每当我们要向项目提交代码变更时，操作的对象叫 **Pull Request（PR）**。  这个名字乍看有点反直觉——明明是我"推送"代码，为什么叫"拉取请求"？

---

## 一句话解释

> **Pull Request 的意思是：我请求你（项目维护者）从我的仓库里"拉取"我刚刚推送的代码变更。**

---

## 为什么不是 "Push Request"？

我们先用一张图看懂 Git 协作的基本模型：

![Git 协作模型示意图](/images/Gemini_Generated_Image_fnavp4fnavp4fnav.png)

> *图中展示了 Fork、Clone、Push、Pull Request、Merge 的基本流向*

### 关键点拆解

| 角色 | 动作 | 权限 |
|------|------|------|
| 普通开发者 | Fork + Clone + Push（到自己的远程仓库） | 只有自己仓库的写权限 |
| 项目维护者 | Pull（从你的仓库拉取） + Merge | 拥有主仓库的写权限 |

**Pull Request 的本质是一个"请求"**：

> "我无权直接改主仓库，请你（维护者）执行 `git pull` 把我的改动合进去。"

如果把"拉取请求"改成 **"推送请求（Push Request）"**，语义会变成：  

> "请求获得直接向主仓库推送的权限"  

但这并不是代码评审流程的真实情况。

---

## 一次完整 Pull Request 的动作拆解

下面这张图展示了从本地修改到 PR 合并的全过程：

![PR 工作流程图](/images/Gemini_Generated_Image_on38eqon38eqon38.png)

### 分步说明

1. **Fork** 主仓库 → 获得自己的远程副本  
2. **Clone** 到本地 → 创建分支并写代码  
3. **Push** → 把新分支推送到**自己的远程仓库**  
4. 打开 GitHub → 点击 **New Pull Request**  
5. 系统自动比较：  
   - 基础分支：主仓库的 `main`  
   - 对比分支：你仓库的 `feature-x`  
6. 你发出请求 → 维护者看到 **"有人请求我拉取他的代码"**  
7. 维护者执行合并（`git pull` 或点击 Merge）

---

## 为什么这个命名是合理的？

### 从 Git 命令角度理解

如果维护者在命令行手动合并一个 PR，他会这样做：

```bash
git checkout main
git pull https://github.com/你的用户名/你的仓库.git feature-x
```

你看，动作正是 pull——拉取别人的远程分支到自己的本地仓库。

因此，Pull Request 准确描述了维护者将要执行的操作，而不是贡献者的动作。