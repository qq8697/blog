# 发布网安业务快速入门博文 — 执行计划

## Context

计划文件 `plan-netsec-intro.md`（755行）已包含完整的文章大纲、表格、流程说明和元数据。需要将其转化为 Hexo 可渲染的 Markdown 博文，生成静态页面并本地预览。

## 执行步骤

### Task 1: 创建博文 Markdown 文件

**目标文件**: `d:/Programs/blog-source/source/_posts/netsec-quick-intro.md`

**内容**: 将计划文件中的"文章大纲"部分（第9~717行）转换为正式博文，保留：
- 第一部分：五大板块全景图（表格形式保留，适合读者快速浏览）
- 第二部分：业务关系图 + 7组关系总结
- 第三部分：8个业务流程的详细拆解（表格+流程图）
- 第四部分：入行建议

**Front matter**（使用计划文件中的元数据）:
```yaml
---
title: 网络安全业务快速入门 — 一张图看懂网安行业都在干什么
date: 2026-05-21 10:00:00
categories:
  - 技术
  - 网络安全
tags:
  - 渗透测试
  - 代码审计
  - 漏洞挖掘
  - 红蓝对抗
  - 安全运营
  - 应急响应
  - 入行指南
  - 网安入门
---
```

**格式调整**:
- 计划中的 `####` 标题降为 `###` 或 `##`（Hexo 博文内 `##` 是顶级标题）
- 保持所有表格不变
- 保持 ASCII 流程图不变（用代码块包裹）
- 确保表格中的 `|` 格式正确（Hexo 要求表格每列间用 `|` 分隔，表头下方用 `|---` 分隔线）

### Task 2: 生成静态页面

```bash
cd d:/Programs/blog-source
$env:PATH = "$env:USERPROFILE\nodejs\node-v20.18.1-win-x64;$env:PATH"
npx hexo generate
```

这会触发图片压缩脚本并按 `_config.yml` 配置输出到 `../blog/`。

### Task 3: 启动本地预览

```bash
npx hexo server --port 4000
```

预览地址: `http://localhost:4000/blog/2026/05/netsec-quick-intro.html`

### Task 4: 打开预览浏览器

使用 RunPreview 工具打开 `http://localhost:4000/blog/`。

## 注意事项

1. 计划文件中的表格格式已与 Hexo Markdown 兼容，无需大幅修改
2. ASCII 流程图需要用 ` ``` ` 代码块包裹以避免被 Markdown 解析器误处理
3. 文章较长（700+行），确保 Hexo 渲染不超时
4. 检查所有 `|` 表格分隔符 — Hexo 的 marked 渲染器要求表格格式严格正确

## 验证

- 博文能正常加载: `http://localhost:4000/blog/2026/05/netsec-quick-intro.html`
- 所有表格正确渲染
- 所有 ASCII 图正确显示
- 侧边栏分类"网络安全"能跳转正确
- 标签页能显示新增标签
