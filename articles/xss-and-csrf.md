---
title: "XSS 和 CSRF 有什么区别？"
description: "用博客留言和修改邮箱解释 XSS 与 CSRF，说明浏览器何时附带 Cookie，以及日常开发中的防护方式。"
category: "technology"
date: "2026-11-09"
---

# XSS 和 CSRF 有什么区别？

**XSS 是让攻击者的代码在你的网站里运行。CSRF 是让用户的浏览器借着已有的登录状态，替用户做一件他没打算做的事。** 一个常见于留言、富文本等内容的渲染，另一个常见于使用 Cookie 登录的修改接口。

## XSS：一条留言怎么变成了代码？

假设博客允许读者留言。后端保存留言，前端用 `innerHTML` 把留言插进页面。如果留言里带着能执行代码的 HTML，其他读者打开评论区时，浏览器就可能执行它。脚本运行在博客的来源下，因此可以读取页面上显示的数据，也可以用读者当前的登录状态调用接口。[OWASP 的 XSS 防护指南](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

如果留言只需要显示文本，用 `textContent` 就够了：

```js
commentElement.textContent = comment;
```

用 React 写 `{comment}` 也会把字符串按文本处理。这就是为什么平时写组件时，你可能没专门做过转义，框架已经帮你处理了这条输出路径。如果业务确实需要渲染富文本，比如保留加粗和链接，就先用 DOMPurify 之类的库清洗 HTML，再交给 `dangerouslySetInnerHTML`。CSP 可以再限制哪些脚本能够执行，作为额外防护。[React 的 HTML 渲染说明](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html) · [OWASP 的 HTML 清洗指南](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#html-sanitization)

## CSRF：新打开的页面怎么能用我的登录状态？

假设你先登录了 `shop.example`，浏览器保存了这个网站的登录 Cookie。之后，你打开另一个网站 `evil.test`。这个恶意页面提交一个表单，目标是 `https://shop.example/account/email`。

**Cookie 是浏览器发给目标网站的。** 浏览器看到表单的目标是 `shop.example`，就按目标地址和 Cookie 的 `SameSite` 等规则，决定是否带上商城的登录 Cookie。恶意页面只要能触发这次请求，就有机会让后端执行操作，无需知道 Cookie 的内容。[OWASP 的 CSRF 攻击说明](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#introduction)

如果后端只验证登录 Cookie，就可能把这个表单当成用户自己提交的，直接改掉邮箱。这也解释了 CORS 在这里的局限：即使浏览器不让恶意页面**读取响应**，后端也可能已经完成了**修改操作**。[Fetch 标准的 CORS 协议](https://fetch.spec.whatwg.org/#http-cors-protocol) · [OWASP 的 CSRF 防护指南](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## Cookie 登录的接口怎么防 CSRF？

- **让后端验证 CSRF Token。** 网站把一个与会话绑定的随机值交给自己的页面。页面提交修改请求时带上这个值，后端验证通过才执行。恶意页面即使触发了带 Cookie 的请求，也缺少这个值。[OWASP 的 CSRF Token 指南](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern)
- **设置合适的 `SameSite`，并让 `GET` 保持只读。** `SameSite=Lax` 或 `Strict` 可以限制跨站请求携带登录 Cookie。修改邮箱、删除文章等操作用 `POST`、`PATCH` 或 `DELETE`，并在后端做验证。后端还可以检查 `Origin`，只接受受信任的来源。[OWASP 的 CSRF 分层防护](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#defense-in-depth-techniques)

## 为什么有些项目很少遇到典型的 CSRF？

有些 API 要求前端主动在请求里加 `Authorization: Bearer ...`，比如使用 Firebase ID Token 的接口。浏览器不会把应用里的 Bearer Token 自动填进另一个网页发出的表单请求。所以，当接口只接受这种凭据时，恶意页面即使能触发请求，也缺少完成认证所需的 Token。

判断自己的项目时，可以从两个地方看起：**前端把用户输入当文本还是当 HTML 渲染，后端用浏览器自动携带的 Cookie 还是客户端主动添加的 Token 做认证。** 前者决定常见的 XSS 风险从哪里进来，后者决定典型的 CSRF 有没有机会发生。
