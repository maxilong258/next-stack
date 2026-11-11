---
title: "HTTP 缓存是怎么用上的？"
description: "用博客静态资源和 API 解释强缓存、协商缓存与 Cache-Control，并区分浏览器缓存和后端 Redis 缓存。"
category: "technology"
date: "2026-11-09"
---

# HTTP 缓存是怎么用上的？

第一次打开博客，浏览器会下载页面需要的 CSS 和 JavaScript。再打开另一篇文章，如果它们用的是同一份文件，浏览器就可能直接从本地拿。前端代码没有写缓存逻辑，服务器也没有收到这次资源请求。**这就是 HTTP 缓存容易被忽略的原因：服务器给出规则，浏览器自动执行。** [HTTP 缓存标准](https://www.rfc-editor.org/rfc/rfc9111.html)

## 再次访问时，什么时候需要发请求？

假设浏览器第一次请求 `/app.css`，收到下面的响应头。

```http
HTTP/1.1 200 OK
Cache-Control: max-age=60
ETag: "css-v1"
```

`max-age=60` 表示这份响应的新鲜期是 60 秒。`ETag` 是服务器给这份内容的版本标识。再次访问时，浏览器会根据缓存状态决定怎么做。

- **缓存还新鲜。** 浏览器可以直接复用本地文件，省掉网络请求。这个过程常叫**强缓存**。
- **缓存过期，需要重新验证。** 浏览器发请求，带上 `If-None-Match: "css-v1"`。如果文件没变，服务器返回 `304 Not Modified`，浏览器继续用本地正文。如果文件变了，服务器通常会返回 `200 OK` 和新版正文。这个过程常叫**协商缓存**。[缓存的有效期与重新验证](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.2)

## 日常开发里，哪些地方会用到？

**博客的静态资源通常由构建框架自动处理。** 以 Next.js 为例，生产构建会给不可变的静态资源设置长缓存。比如文章引用 `app.a1b2c3.css`，发布新版后，HTML 会引用一个新文件名 `app.d4e5f6.css`。浏览器看到的是新地址，会去拿新文件，旧地址仍然可以长期缓存。开发模式下，普通构建资源往往会带上 `no-store`，所以在本地更难看到长缓存的效果。[Next.js 的静态资源缓存](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers#cache-control)

**API 要根据数据能接受多旧来配置。** 例如，博客的公开分类列表允许晚一分钟显示更新，就可以给 `GET /api/categories` 返回 `Cache-Control: public, max-age=60`。浏览器可以复用这份响应，CDN 也可以缓存它。需要在每次复用前确认版本的页面，可以用 `no-cache`。用户自己的订单等个性化响应，可以用 `private` 限制共享缓存。若这次响应不应被缓存，就用 `no-store`。[`Cache-Control` 响应指令](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2)

| 指令 | 它控制什么 |
| --- | --- |
| `max-age=60` | 缓存多久可以直接复用 |
| `no-cache` | 可以存，但每次复用前都要验证 |
| `no-store` | 这次响应不应被缓存 |
| `private` | 允许浏览器这类私有缓存保存，禁止 CDN 这类共享缓存保存 |

## HTTP 缓存和后端 Redis 缓存有什么区别？

以一个用 Redis 缓存列表的 NestJS 接口为例，`@CacheTTL()` 管的是**服务端保存查询结果多久**。浏览器仍然把请求发给后端，后端命中 Redis 时，可以少查一次数据库。

`Cache-Control: max-age=300` 管的是**客户端或代理可以复用 HTTP 响应多久**。如果浏览器命中自己的新鲜缓存，这次请求甚至不会到达后端。两个地方都可以设为五分钟，但一个节省的是后端查询，另一个可以省掉网络往返。[NestJS 缓存拦截器源码](https://github.com/nestjs/cache-manager/blob/3.0.1/lib/interceptors/cache.interceptor.ts#L46) · [HTTP 缓存标准](https://www.rfc-editor.org/rfc/rfc9111.html)

想在自己的项目里看到它，可以打开 Chrome DevTools 的 **Network**，确认 **Disable cache** 没勾选，再正常访问两个共用同一份静态资源的页面。点开资源，在 **Response Headers** 里找 `Cache-Control`。看到 **`from memory cache`** 或 **`from disk cache`**，说明浏览器用了本地副本。看到 **`304`**，则说明它发了请求确认版本，但省掉了正文下载。[Chrome DevTools 的缓存设置](https://developer.chrome.com/docs/devtools/network/reference/#disable-cache)
