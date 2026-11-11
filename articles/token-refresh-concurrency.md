---
title: "多个接口同时返回 401，怎么只刷新一次 Token？"
description: "用 React 和 NestJS 示例说明 Refresh Token 的用途、如何共享刷新 Promise，以及如何处理刷新结束后才返回的旧 401。"
category: "technology"
date: "2026-11-10"
---

# 多个接口同时返回 `401`，怎么只刷新一次 Token？

打开一个后台页面时，用户信息、订单列表和未读通知往往会一起请求。如果 Access Token 恰好过期，三个接口都可能返回 `401`。如果每个请求都单独调用 `/auth/refresh`，就会发出三次刷新请求。后端如果采用了 Refresh Token 轮换，第一次刷新成功后，后面两次还可能拿着已经失效的旧凭证去刷新。 [IETF · Refresh Token 轮换](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2)

可以在公共请求层保存一个 **`refreshPromise`**。第一个发现 Token 过期的请求发起刷新，其他请求等待同一个 Promise。刷新成功后，它们再用新的 Access Token 各自重试一次。

## 为什么要有 Refresh Token？

Access Token 用来访问业务接口，可以设置较短的有效期。Refresh Token 用来在 Access Token 过期后换取新的凭证，让用户继续使用应用。

OAuth 2.0 允许授权服务器决定是否发放 Refresh Token。比如网站只是用第三方账号确认用户身份，登录后就建立自己的 Cookie 会话，之后也无需调用第三方 API，那就不一定需要第三方 Refresh Token。下面的例子针对**应用自己采用 Access Token + Refresh Token 续期的场景**。 [OAuth 2.0 · Refresh Token](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.5)

## NestJS 验证旧凭证并返回新 Token

假设 React 和 NestJS 同源。登录成功后，NestJS 把 Access Token 返回给 React，把 Refresh Token 写进 `HttpOnly` Cookie。浏览器调用 `/auth/refresh` 时会自动带上这个 Cookie。

下面是 `AuthController` 里的刷新接口，控制器的路由前缀是 `auth`。示例使用 NestJS 的 Express 适配器，并假设已配置 `cookie-parser`。 [NestJS · Cookie](https://docs.nestjs.com/techniques/cookies) · [MDN · Fetch 如何携带 Cookie](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#including_credentials)

```ts
@Post('refresh')
@HttpCode(200)
async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
  const oldToken = req.cookies?.refresh_token;
  if (!oldToken) throw new UnauthorizedException();

  const { accessToken, refreshToken } =
    await this.authService.rotateRefreshToken(oldToken);

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/auth',
  });

  return { accessToken };
}
```

`rotateRefreshToken()` 在服务端验证旧凭证和会话，并原子地使旧 Refresh Token 失效、保存新的 Refresh Token。业务接口的认证 Guard 则在确认 **Access Token 已过期**时，返回 `401` 和约定好的错误码 `ACCESS_TOKEN_EXPIRED`，方便前端识别需要续期的请求。 [OAuth 2.0 · 刷新 Access Token](https://www.rfc-editor.org/rfc/rfc6749.html#section-6)

## React 共用一次刷新，并处理晚到的 `401`

除了共享 Promise，还要记住**原请求用的是哪个 Token**。假设订单接口已经把 `T1` 刷成了 `T2`，这时通知接口才收到用 `T1` 发出的请求的 `401`。刷新已经结束，`refreshPromise` 也清空了。通知接口发现当前已经是 `T2`，就可以直接用 `T2` 重试。

下面是公共请求模块里的简化示例，协调同一个标签页、同一次登录会话里的请求。登录成功后给 `accessToken` 赋值，业务组件通过 `apiGet()` 发请求。

```js
let accessToken
let refreshPromise

function refreshOnce() {
  refreshPromise ??= fetch('/auth/refresh', { method: 'POST' })
    .then(async response => {
      if (!response.ok) throw new Error('登录续期失败')

      const data = await response.json()
      accessToken = data.accessToken
      return accessToken
    })
    .finally(() => {
      refreshPromise = undefined
    })

  return refreshPromise
}

async function apiGet(url) {
  const sentToken = accessToken
  const send = token =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  const response = await send(sentToken)
  if (response.status !== 401) return response

  const error = await response.clone().json().catch(() => null)
  if (error?.code !== 'ACCESS_TOKEN_EXPIRED') return response

  const token = accessToken === sentToken
    ? await refreshOnce()
    : accessToken

  return send(token)
}
```

这里最后一行直接调用底层的 `send()`，所以业务请求**最多重试一次**。刷新接口也直接用 `fetch()`，它失败时不会再次进入刷新逻辑。如果后端明确告知 Refresh Token 已失效，应用可以在统一的刷新逻辑里处理登录失效，等待中的请求都会收到这次刷新的失败结果。

验证时可以模拟两种情况。先让三个接口同时返回 `ACCESS_TOKEN_EXPIRED`，再让其中一个接口的 `401` 在刷新完成后才返回。两种情况下，Network 面板都应该只看到一次 `/auth/refresh`。
