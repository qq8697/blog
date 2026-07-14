---
title: 你好，圣堂
date: 2018-10-08 19:19:28
---

> 秘密已经泄露，战斗一触即发！

### 为什么要写博客

Q：为什么要写博客？
A：尝试 坚持做一件事情

Q：为什么要写博客？
A：学会 组织语言

<!-- more -->

Q：为什么要写博客？
A：完成 一个小工程

Q：为什么要写博客？
A：找到 自我和朋友

### 博客写什么

学习、旅行、工作、爱好…

### 博客站的实现方案

有以下两种常见选择：

1. 使用公共平台，自己负责写文章，如CSDN、掘金、简书等以及爬取CSDN文章的各种网站。
2. 不想受制于平台，博客形式和文章内容均由个人完成，有以下两种方案：
   - 动态网站，写一套前台用于展示，写一套后台管理内容，使用数据库存储数据。
   - 静态网站，服务器下是真实存在的静态文件，也有以下两种方案：
     - 前端异步加载 `.md` 文件，再渲染为 `DOM` 内容插入 `html` 中，-> [mark2web](http://mark2web.wuhongbin.com) 站的实现方式。
     - 前端请求获取 `.html` 文件，`.html` 文件是由 `.md` 文件在项目部署前编译生成的 -> 本站的实现方式。

（默认使用 [markdown](https://www.appinn.com/markdown/) 语法编辑文章内容，而不是使用富文本（RTF(Rich Text Format)））
使用公共平台还是自己编程实现，我选择后者，自己动手丰衣足食；为什么不选择动态网站的方案？因为额外需要后台管理系统+数据库+服务器，有些小题大做了，静态站点直接扔到 [github pages](https://pages.github.com/) 托管就可以了。

### 构成博客站的轮子

- 域名的购买、备案 -> [阿里云 - 万网](https://wanwang.aliyun.com/?utm_content=se_1000301943)
- 域名解析 -> [DNSPOD](https://www.dnspod.cn/)
- [github pages](https://pages.github.com/) 托管、自定义域名（CNAME）
- 静态网站生成器 -> [hexo](https://hexo.io/zh-cn/)
- 站内搜索 -> [hexo-generator-json-content](https://www.npmjs.com/package/hexo-generator-json-content)
- JavaScript库 -> [jQuery](https://jquery.com/)
- JavaScript模板引擎 -> [ejs](https://ejs.bootcss.com/)
- `.md` 文件渲染为 `DOM` 结构 -> [marked](https://www.npmjs.com/package/marked)
- 代码高亮 -> [highlightjs](https://highlightjs.org/)
- 字体图标 -> [Font Awesome](http://fontawesome.io)
- 页面分享 -> [百度分享 - bshare](http://www.bshare.cn/)
- 文章评论 -> [valine](https://valine.js.org/)
- 图片画廊 -> [lightgallery.js](https://sachinchoolur.github.io/lightgallery.js/)
- 数据分析 -> [谷歌分析](https://analytics.google.com/analytics/web/) & [百度统计](https://tongji.baidu.com/web/welcome/login)

### Templar Assassin

![TA](/images/ta00.jpg)
