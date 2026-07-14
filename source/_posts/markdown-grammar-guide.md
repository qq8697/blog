---
title: Markdown 语法指南
date: 2018-10-24 15:10:35
---

使用 `Markdown` 语法撰写技术文章，只专注于内容和技术，不用费心排版的问题，易写又易读，写作体验非常舒适。
这是一份简要的 `Markdown` 语法指南, :kissing_heart:。

<!-- more -->

## 常用语法

### 0. 强调

语法格式： `**文字**` **文字**

### 1. 标题

语法格式： `#` + 空格 + 文本

```
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
```

### 2. 列表

无序列表语法格式： `-` + 空格 + 文本

- 文本一
- 文本二
- 文本三

有序列表语法格式： 数字 + `.` + 空格 + 文本

1. 文本一
2. 文本二
3. 文本三

### 3. 链接和图片

插入链接的语法格式： `[显示文本](链接地址)`
我的blog - [TA圣堂米拉娜](https://qq8697.github.io/blog/)

插入图片的语法格式： `![图片的标注](链接地址)`
![avatar](/css/images/avatar.jpg)

### 4. 引用

语法格式：`>` + 空格 + 文本
例如：

> Markdown 是一种轻量级标记语言，它允许人们使用易读易写的纯文本格式编写文档，然后转换成格式丰富的HTML页面。

### 5. 代码

行内代码语法： \` + 代码 + \`
例如： `let xhr = new XMLHttpRequest()`

（使用缩进）代码块语法：

    // 其他文字
    // 空一行
    代码块

例如：

    let xhr = new XMLHttpRequest()
    xhr.open("POST", "/")
    xhr.send("name='sj'&age=23")

（使用\`\`\`）代码块语法：

````
```language
    代码块
```
````

例如：

```JavaScript
let xhr = new XMLHttpRequest()
xhr.open("POST", "/")
xhr.send("name='sj'&age=23")
```

### 6. 表格

PS. Markdown语法原生不支持表格，扩展该功能需要其衍生版本。
[GitHub Flavored Markdown](https://help.github.com/articles/basic-writing-and-formatting-syntax/) 表格语法（可以使用冒号来定义对齐方式）：

```
| header1 | header2 |
| :---| ---:| :---: |
| content1-1 | content1-2 |
| content2-1 | content2-2 |
```

例如：

| 项目 | 价格 | 数量 |
| :--- | ---: | :---: |
| iPhone | 6000 元 | 5 |
| iPad | 3800 元 | 12 |
| iMac | 10000 元 | 234 |

### 7. 转义

以下符号需要转义，即在符号前添加反斜杠 `\`

```
\   反斜线
`   反引号
*   星号
_   底线
{}  花括号
[]  方括号
()  括弧
#   井字号
+   加号
-   减号
.   英文句点
!   惊叹号
```

## 结语

以上是最常见的 `Markdown` 的语法和格式，如果希望深入的学习 `Markdown`，可以参考 [Markdown语法说明](http://wowubuntu.com/markdown/) 以及其它 `Markdown` 语法扩展版本。

PS. [Github Flavored Markdown](https://help.github.com/articles/basic-writing-and-formatting-syntax/) 的扩展功能包括：

1. 中划线 `~~文本~~` ~~文本~~
2. 表格
3. 锚链接 `[结语](#结语)` [结语](#结语)
4. 任务列表
    ```
    - [ ] incomplete
    - [x] complete
    ```
5. emoji表情 `:joy:` :joy:（[emoji-cheat-sheet](emoji-cheat-sheet.com)）

PS. 本站使用 [marked](https://www.npmjs.com/package/marked) 将 `.md` 文件渲染为 `dom` 结构，解析规则又与 `Markdown` 及其多种扩展版本些许不同，比如不支持emoji， ╮(╯▽╰)╭ 。
