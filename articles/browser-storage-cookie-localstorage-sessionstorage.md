---
title: "Cookie、localStorage、sessionStorage 有什么区别？"
description: "比较三种浏览器存储的有效期、共享范围和请求行为，用登录、主题和表单进度举例，并说明 HTTPS 如何保护 Cookie。"
category: "technology"
date: "2026-11-11"
---

# Cookie、`localStorage`、`sessionStorage` 有什么区别？

登录后刷新页面，网站还认得你。切换成深色模式，关掉浏览器再打开，主题也还在。填到一半的表单刷新后能恢复，另开一个标签页又可以独立填写。这些场景都涉及浏览器存储，区别在于**数据保留多久、哪些页面能共享，以及它会不会随请求发给服务器**。

| 对比项 | Cookie | `localStorage` | `sessionStorage` |
| --- | --- | --- | --- |
| 会随 HTTP 请求自动发送吗？ | 浏览器会在符合条件的请求中携带 | 不会 | 不会 |
| 刷新页面后还在吗？ | 有效期内还在 | 在 | 在 |
| 关掉页面后还在吗？ | 取决于过期设置和浏览器会话 | 通常还在，关闭浏览器也能保留 | 关闭标签页通常会结束这次会话 |
| 不同标签页能共享吗？ | 符合 Cookie 作用域的页面可以使用同一个 Cookie | 同源页面可以共享 | 各标签页独立保存 |
| 网页 JS 能读取吗？ | 普通 Cookie 可以，`HttpOnly` Cookie 不可以 | 可以 | 可以 |

两种 Storage 都按**同源**隔离。同源要求协议、域名和端口都相同，所以 `http://localhost:3000` 和 `http://localhost:5173` 有各自的存储。

## Cookie 可以用来维持登录状态

一种常见做法是，用户登录成功后，服务器通过 `Set-Cookie` 让浏览器保存一个会话 ID。之后用户打开订单页，浏览器会在符合条件的请求中自动带上这个 Cookie，服务器根据会话 ID 找到对应的用户。

即使 Cookie 设置了 `HttpOnly`，网页 JS 无法读取它，浏览器也仍然可以发送它。

## `localStorage` 可以记住长期偏好

比如用户选择了深色模式，前端可以用 `localStorage` 记住这个设置。刷新页面、关掉浏览器再打开，或者另开一个同源标签页，前端都可以读到它。

```js
localStorage.setItem('theme', 'dark')
const theme = localStorage.getItem('theme')
```

## `sessionStorage` 可以保存当前标签页的进度

比如一个表单有三步，用户填到第二步时，可以把当前步骤存到 `sessionStorage`。在同一个标签页刷新，页面能恢复到第二步。如果两个标签页分别填写，彼此的修改也不会覆盖。

```js
sessionStorage.setItem('form-step', '2')
const step = sessionStorage.getItem('form-step')
```

## Cookie 跟着请求发送，安全吗？

Cookie 是请求头的一部分。用 **HTTPS** 时，TLS 会加密请求头，同一个 Wi‑Fi 上的人即使截获了流量，也读不到其中的 Cookie。用普通 **HTTP** 时，如果浏览器发送了 Cookie，它就会明文传输。 [TLS 1.3 规范](https://www.rfc-editor.org/rfc/rfc8446.html#section-1)

登录 Cookie 常搭配三个属性。`Secure` 限制它通过 HTTPS 发送，`HttpOnly` 阻止网页脚本读取它，`SameSite` 控制浏览器在什么情况下会随跨站请求携带它，从而降低 CSRF 风险。 [OWASP 会话管理指南](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#cookies)
