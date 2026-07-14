---
title: 正确的使用GET与POST方法发送请求
date: 2018-09-18 15:10:35
categories:
  - [HTTP, GET & POST]
tags:
  - HTTP
---

## GET请求 -> url上的参数需要转义

```javascript
function ajax(url, data) {
    let args = []
    for (key in data) {
        args.push(`${encodeURIComponent(key)} = ${encodeURIComponent(data[key])}`)
    }
    let query = args.join('&')
    url += ~url.indexOf('?') ? `&${query}` : `?${query}`

    let xhr = new XMLHttpRequest()
    xhr.open("GET", url)
    xhr.send()
}
```

GET请求url参数上 key/value 对中的 value 除了简单类型的变量还可能是数组或者对象，需要做判断与处理：

对象的话使用 `encodeURIComponent` 会变成对 `"[object Object]"` 的转义：

```javascript
encodeURIComponent("[object Object]") === encodeURIComponent({page:5}) // true
// "%5Bobject%20Object%5D"
```

- 数组 `{ids: [1,2,3]}` -> `ids[0]=1&ids[1]=2&ids[2]=3`
- 对象 `{user: {name: 'sj', age: 23}}` -> `user[name]='sj'&user[age]=23`

## POST请求 -> 参数在请求体中

（url上也可以，因为一般的web框架的POST请求都会收到url和请求体，取决于后端如何处理）

默认的mime类型为 `text/plain` ，请求参数在 Request Payload 下以 key=value 并由 `&` 连接形式显示 -> 并不是按照字段分行显示

```javascript
// 控制台下发送POST请求
let xhr = new XMLHttpRequest()
xhr.open("POST", "/")
xhr.send("name='sj'&age=23")

// 查看请求信息
// Request Headers
// Content-Type: text/plain;charset=UTF-8
// Request Payload
// name='sj'&age=23
```

<!-- more -->

设置 Content-Type 为 `"application/x-www-form-urlencoded"` -> 请求参数在 Form Data 下按照字段分行显示

```javascript
// 控制台下发送POST请求
let xhr = new XMLHttpRequest()
xhr.open("POST", "/")
xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
xhr.send("name=sj&age=23")

// 查看请求信息
// Request Headers
// Content-Type: application/x-www-form-urlencoded
// Form Data
// name='sj'
// age=23
```

以上send（发送）的是字符串，如果是object呢？-> 如下，实际上调用了 Object 的 toString 方法 -> 所以，send的数据需要转换成字符串。

```javascript
// 控制台下发送POST请求
let xhr = new XMLHttpRequest()
xhr.open("POST", "/")
xhr.send({name: 'sj', age: 23})

// 查看请求信息
// Request Payload
// [object Object]
```

想要使用json格式发送请求，需要指定 Content-Type 为 application/json，然后send的数据要 stringify一下

```javascript
// 构造json数据
let data = {name: 'sj', age: 23}

// 控制台下发送POST请求
let xhr = new XMLHttpRequest()
xhr.open("POST", "/")
xhr.setRequestHeader("Content-type", "application/json")
xhr.send(JSON.stringify(data))

// 查看请求信息
// Content-type:application/json
// Request Payload
// {"name":"sj","age":23}
```

mime类型 `multipart/form-data`，通常用于文件上传，如下所示，Request Payload 下字段和字段之间用随机字符串隔开，内容不需要转义（仍然是中文"圣剑"），因为内容很大的话，转义需要时间

```javascript
// 构造表单
let formData = new FormData()
formData.append('name', '圣剑')
formData.append('age', 23) // 数字23会被立即转换成字符串 "23"
// 上传文件
// formData.append("file", input.files[0])

// 控制台下发送POST请求
let xhr = new XMLHttpRequest();
xhr.open("POST", "/")
xhr.send(formData)

// 查看请求信息
// multipart/form-data; boundary=----WebKitFormBoundarywUtUVlMY3HJnC3E3
// Request Payload
// ------WebKitFormBoundarywUtUVlMY3HJnC3E3
// Content-Disposition: form-data; name="name"
// 圣剑
// ------WebKitFormBoundarywUtUVlMY3HJnC3E3
// Content-Disposition: form-data; name="age"
// 23
```
