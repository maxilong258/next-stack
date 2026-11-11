---
title: "什么是跨域？CORS 是怎么工作的？"
description: "用跨域 GET 和 JSON POST 解释浏览器同源策略、OPTIONS 预检、跨域 Cookie，以及如何用 Network 面板排查 CORS。"
category: "technology"
date: "2026-11-09"
---

# 什么是跨域？CORS 是怎么工作的？

前端调用 API 时，有时会看到服务端日志显示请求成功，浏览器控制台却报 CORS 错误。**服务器处理了请求，浏览器仍可能阻止页面脚本读取响应。** 如果浏览器先做了预检，预检失败还会让实际请求根本发不出去。要区分这两种情况，可以先从浏览器如何判断跨域说起。[Fetch 标准的 CORS 协议](https://fetch.spec.whatwg.org/#http-cors-protocol)

## 什么是跨域？

对于 HTTP 和 HTTPS 地址，浏览器用**协议、主机和端口**判断是否同源。三项都一致才是同源，路径和查询参数不影响这个判断。假设页面地址是 `https://app.example.com`。

| 请求地址 | 是否同源 | 原因 |
| --- | --- | --- |
| `https://app.example.com/api/users` | 同源 | 只有路径不同 |
| `https://api.example.com/users` | 跨域 | 主机不同 |
| `https://app.example.com:8443/api/users` | 跨域 | 端口不同 |
| `http://app.example.com/api/users` | 跨域 | 协议不同 |

浏览器的同源策略默认限制网页脚本读取其他源的数据。CORS（Cross-Origin Resource Sharing，跨源资源共享）允许 API 通过 HTTP 响应头声明哪些源可以读取响应，再由浏览器执行检查。[MDN 同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy) · [Fetch 标准的 CORS 协议](https://fetch.spec.whatwg.org/#http-cors-protocol)

## 跨域 GET 为什么可以直接发？

假设 `https://app.example.com` 上的页面发起 `fetch("https://api.example.com/users")`。这个普通 GET 不需要预检。浏览器直接发出请求，并自动加上 `Origin`，告诉 API 请求来自哪个源。

```http
GET /users HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
```

API 如果允许这个源，可以在响应中返回 `Access-Control-Allow-Origin: https://app.example.com`。浏览器检查通过后，才把响应交给 JavaScript。即使 API 返回了 `200 OK`，缺少匹配的许可头也会让 `fetch()` 无法读取响应。[MDN 简单请求](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#simple_requests)

## 什么时候会多出一个 OPTIONS？

如果把请求改成带 `Content-Type: application/json` 的 `POST`，在没有可复用的预检结果时，浏览器会先自动发一个 `OPTIONS` 请求。它会说明请求来自哪个源、实际请求要用什么方法，以及要带哪些需要许可的请求头。

```http
OPTIONS /users HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type
```

API 可以用下面的响应允许这次请求。

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type
```

预检通过后，浏览器才发送实际的 `POST`。**实际响应仍需要带上匹配的 `Access-Control-Allow-Origin`**，浏览器才能把响应交给页面。跨域 `PUT`、`DELETE`，以及显式设置 `Authorization` 请求头，也会触发预检。是否触发预检取决于请求，接口返回 JSON 本身不会让一个普通 GET 多出 `OPTIONS`。[MDN 预检请求](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#preflighted_requests)

## 跨域接口需要带 Cookie 怎么办？

如果 API 依赖 Cookie 登录，前端可以设置 `fetch(url, { credentials: "include" })`。服务端需要返回具体的 `Access-Control-Allow-Origin` 和 `Access-Control-Allow-Credentials: true`。这种情况下，允许来源不能写成 `*`。如果请求需要预检，预检本身不带 Cookie，服务端仍需在预检响应里声明允许凭证。实际请求是否能带上 Cookie，还取决于 Cookie 属性和浏览器策略。[Fetch 标准的凭证规则](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials) · [MDN 凭证请求](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#requests_with_credentials)

## 遇到 CORS 错误，先看哪一条请求？

打开浏览器开发者工具的 **Network** 面板，找到接口请求。先确认有没有 `OPTIONS`，再看实际请求是否发出。

- **只有 `OPTIONS`，没有实际请求。** 看预检是否返回成功状态，再对照请求中的 `Origin`、方法和请求头，检查服务端声明的许可是否匹配。
- **实际请求已经发出。** 检查实际响应的 CORS 响应头。如果成功响应配置正确，也看看 `401`、`403` 等错误响应是否带上了同样适用的 CORS 头，否则前端可能读不到真实的业务错误。

`curl` 可以直接拿到响应，而浏览器里的 `fetch()` 仍可能报错，因为执行 CORS 检查的是浏览器。正式接口仍要在服务端验证用户身份和操作权限。[Fetch 标准的 CORS 响应规则](https://fetch.spec.whatwg.org/#http-responses)
