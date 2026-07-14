---
title: 将静态博客迁移到 Hexo — 从手写 HTML 到 Markdown 自动化
date: 2026-05-18 12:00:00
categories:
  - [博客, Hexo]
tags:
  - Hexo
  - GitHub Pages
  - Markdown
  - 博客搭建
---

## 缘起

我的个人博客「TA圣堂米拉娜」自 2018 年搭建以来，一直托管在 GitHub Pages 上。最初使用 Hexo 生成，后来由于某些原因，仓库中只保留了生成的静态 HTML 文件，丢失了 Hexo 源码。

<!-- more -->

维护纯 HTML 的痛点很明显：每次写新文章需要手动编辑 HTML、更新首页索引、同步 content.json、更新归档/分类/标签页面……繁琐且容易出错。

于是决定重新搭建 Hexo 环境，回归 Markdown 写作流程。

## 迁移过程

### 第一步：域名切换

原博客使用了自定义域名 `blog.wuhongbin.com` 和 `blog.1q2w3e4r.top`，通过 CNAME 文件配置。

为了让博客能通过默认的 GitHub Pages 域名访问，删除了 CNAME 文件，并将站点内所有硬编码的域名引用（共 24 处，分布在 `index.html`、`content.json`、各文章页面、分类/标签/归档页面中）替换为：

```
https://qq8697.github.io/blog/
```

由于该仓库是项目页面（repo 名为 `blog`），GitHub Pages 会将其部署在 `/blog/` 子路径下，因此还需要将所有根路径引用（CSS、JS、图片、内部链接）添加 `/blog/` 前缀。

### 第二步：搭建 Hexo

当前环境没有 Node.js，于是下载了便携版 Node.js（v20.18.1），安装 Hexo CLI，初始化项目：

```bash
npm install -g hexo-cli
hexo init blog-source
```

### 第三步：创建自定义主题

原博客有其独特的视觉风格——左侧个人资料栏、中间文章区、右侧边栏（最新文章、分类、归档、标签云、友情链接）的三栏布局。

为了保持外观一致，基于原站点的 CSS/JS 资源创建了自定义主题 `templar`：

```
themes/templar/
├── _config.yml          # 主题配置（社交链接、评论、统计）
├── layout/
│   ├── layout.ejs       # 主布局框架
│   ├── index.ejs        # 首页文章列表
│   ├── post.ejs         # 文章详情页（含 Valine 评论、百度分享）
│   ├── page.ejs         # 静态页面
│   └── partial/
│       ├── head.ejs     # HTML head 元数据
│       ├── header.ejs   # 导航栏 + 搜索
│       ├── profile.ejs  # 左侧个人资料卡片
│       ├── sidebar.ejs  # 右侧边栏（动态数据）
│       └── footer.ejs   # 页脚
└── source/              # CSS / JS / Libs / Images
```

关键点：
- 搜索功能通过 `hexo-generator-json-content` 插件生成 `content.json`，配合原有的 `insight.js` 实现站内搜索
- Valine 评论系统、百度分享、Google Analytics / 百度统计 均通过主题配置项控制
- 侧边栏数据（最新文章、分类、标签、归档）全部使用 Hexo 的 Helper 函数动态生成

### 第四步：文章迁移

将 3 篇原有的 HTML 文章还原为 Markdown 格式：

| 文章 | 分类 | 标签 |
|------|------|------|
| 正确的使用GET与POST方法发送请求 | HTTP > GET & POST | HTTP |
| 你好，圣堂 | - | - |
| Markdown 语法指南 | - | - |

每篇文章只需在文件头部添加 Front-matter 声明：

```yaml
---
title: 文章标题
date: 2018-09-18 15:10:35
categories:
  - [HTTP, GET & POST]
tags:
  - HTTP
---
```

### 第五步：配置部署

`_config.yml` 中的关键配置：

```yaml
url: https://qq8697.github.io/blog
root: /blog/
permalink: :year/:month/:title.html
public_dir: ../blog

deploy:
  type: git
  repo: https://github.com/qq8697/blog.git
  branch: gh-pages
```

## 最终效果

| 对比项 | 迁移前 | 迁移后 |
|--------|--------|--------|
| 写文章 | 手动编辑 HTML，更新多个文件 | `hexo new "标题"` 一键创建 Markdown |
| 索引更新 | 手动修改 index.html + content.json | 自动生成 |
| 分类/标签/归档 | 手动维护多个页面 | Hexo 自动生成 |
| 部署 | 手动 git push | `hexo deploy` 一键推送 |
| 本地预览 | 需要手动启 HTTP 服务 | `powershell -File server.ps1` |

## 如何写新文章

```bash
# 1. 创建文章
cd blog-source
npx hexo new "我的新文章"

# 2. 编辑 source/_posts/我的新文章.md
#    使用 Markdown 语法，添加分类/标签

# 3. 本地预览
npx hexo generate
powershell -File server.ps1   # http://127.0.0.1:4000

# 4. 部署
npx hexo deploy
```

告别手工 HTML，拥抱 Markdown。
