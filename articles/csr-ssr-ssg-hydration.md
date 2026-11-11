---
title: "CSR、SSR、SSG 和 Hydration，从一个 Next.js 博客页面说起"
description: "用商品详情页和 Next.js 博客说明页面内容的生成时机、客户端激活，以及 use client、use server 和常见 SSG 工具的用途。"
category: "technology"
date: "2026-11-10"
---

# CSR、SSR、SSG 和 Hydration，从一个 Next.js 博客页面说起

打开一篇博客，标题和正文已经看得见了，右上角的主题按钮却可能还要等 JavaScript 加载完才能切换主题。**CSR、SSR、SSG 决定页面内容在哪里、什么时候生成。Hydration 是浏览器里的框架代码接管已有页面的过程。**

## 同一个页面，三种生成方式

假设我们要展示一个商品详情页，页面上有商品名称、价格和「加入购物车」按钮。

| 方式 | 页面内容在哪里、什么时候生成？ | 首次访问时，浏览器收到什么？ |
| --- | --- | --- |
| **CSR**，客户端渲染 | 浏览器执行 JavaScript 后生成 | HTML 外壳和 JS 入口，商品内容由浏览器渲染 |
| **SSR**，服务端渲染 | 用户发起请求后，由服务器生成 | 已经包含商品内容的 HTML |
| **SSG**，静态站点生成 | 构建项目时提前生成 | 已经生成好的 HTML，访问时直接提供 |

SSR 和 SSG 的首屏都可以有完整的商品信息，区别在于服务器什么时候生成它。比如，后台订单页需要根据当前登录用户查数据，可以在收到请求后生成。博客文章在部署前就已确定，可以在构建时生成。同一个 Next.js 应用里，不同页面可以采用不同方式。 [Next.js · 渲染方式](https://nextjs.org/docs/pages/building-your-application/rendering) · [Next.js · 客户端渲染](https://nextjs.org/docs/pages/building-your-application/rendering/client-side-rendering)

用 Vite 脚手架创建的基础 Vue 或 React 单页应用，默认通常走 CSR。它的 `dist` 也可以部署到静态托管上，但页面正文仍然由浏览器执行 JS 后生成。判断是不是 SSG，要看**构建产物里的 HTML 是否已经包含页面内容**。 [Vue · 快速开始](https://vuejs.org/guide/quick-start.html) · [React · 从零创建应用](https://react.dev/learn/build-a-react-app-from-scratch)

## 博客正文走 SSG，主题按钮需要 Hydration

拿这个博客的《大型前端应用怎么管理状态？》来说，文章路由通过 `generateStaticParams()` 列出已有文章的 `slug`。生产构建时，Next.js 用这些参数预渲染文章页。页面读取 Markdown、转成 HTML，再放进 `<article>`。因此浏览器拿到页面时，响应里就已经有标题和正文。 [Next.js · generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

同一页里的 `ThemeToggle` 是一个写了 `"use client"` 的组件。这个指令声明了客户端模块的入口，Next.js 会把浏览器需要的代码打包成 JS。构建时也可以先生成按钮的 `<button>`，所以它能和正文一起显示。等浏览器加载并执行客户端 JS，React 才会让按钮的 `onClick` 生效，点击时调用 `setTheme()`。 [Next.js · use client](https://nextjs.org/docs/app/api-reference/directives/use-client) · [Next.js · 首次加载与激活](https://nextjs.org/docs/app/getting-started/server-and-client-components#on-the-client-first-load)

## React 怎么把点击逻辑接到正确的按钮上？

Next.js App Router 首次加载时，会把 HTML 和一份叫 **RSC Payload** 的数据发给浏览器。这份数据记录了客户端组件在组件树中的位置、传给它的 props，以及加载对应 JavaScript 模块所需的引用。React 由此知道树的这个位置需要用 `ThemeToggle`。 [Next.js · Server 和 Client Components 如何协作](https://nextjs.org/docs/app/getting-started/server-and-client-components#how-do-server-and-client-components-work-in-nextjs)

接下来，React 执行客户端组件，得到预期的输出，然后沿着树去匹配已有的 DOM。走到预期的 `<button>` 时，React 找到对应的实际节点，把它和这次渲染的组件信息关联起来。用户点击按钮时，React 的事件系统就能找到并执行对应的 `onClick`。 [React · hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)

如果生成 HTML 时显示「购物车 0 件」，浏览器第一次渲染时却直接从本地存储读出「购物车 3 件」，两边的初始输出就对不上，可能出现 **Hydration mismatch**。可以让客户端先使用和 HTML 一致的初始值，等组件挂载后再读取本地存储并更新数量。 [React · 初始内容匹配](https://react.dev/reference/react-dom/client/hydrateRoot#hydrating-server-rendered-html)

如果按钮还要在服务器上保存数据，可以用 `"use server"` 声明 **Server Function**。比如客户端调用 `await saveNickname('小明')`，Next.js 会在底层发请求，把函数标识和参数传给服务端。服务端找到对应函数，执行你写的数据库更新逻辑，再把结果传回来。 [Next.js · use server](https://nextjs.org/docs/app/api-reference/directives/use-server) · [React · Server Functions](https://react.dev/reference/rsc/use-server)

## 哪些工具可以做 SSG？

| 工具 | 静态生成方式 |
| --- | --- |
| **Next.js** | 可以预渲染部分路由，也可以用 `output: 'export'` 把支持静态导出的站点输出为静态文件。 [Next.js · 静态导出](https://nextjs.org/docs/app/guides/static-exports) |
| **Nuxt** | Vue 应用框架，可以用 `nuxt generate` 构建并预渲染页面。 [Nuxt · 预渲染](https://github.com/nuxt/nuxt/blob/main/docs/1.getting-started/15.prerendering.md) |
| **Astro** | 默认在构建时生成静态页面，适合博客和内容站。 [Astro · 渲染方式](https://docs.astro.build/en/guides/on-demand-rendering/) |
| **VitePress** | 基于 Vue 和 Vite，把 Markdown 构建成静态页面，常用于技术文档。 [VitePress](https://vitepress.dev/) |

想在自己的项目里看这些步骤，可以打开 DevTools 的 **Network** 面板，在首次页面请求的 **Response** 里搜索一句文章正文。再禁用 JavaScript 刷新，正文仍然可以显示，主题按钮的点击逻辑则需要 JS。要区分文章是在请求时还是构建时生成，可以看 `next build` 的路由输出。开发模式下，`next dev` 会在访问路由时调用 `generateStaticParams()`。 [Next.js · 开发与构建时的行为](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
