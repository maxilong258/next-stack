---
title: "前端性能优化的 9 个常见场景"
description: "从首屏加载、交互卡顿和布局偏移出发，用九个实际场景介绍图片优化、按需加载、虚拟列表和静态资源缓存。"
category: "technology"
date: "2026-11-10"
---

# 前端性能优化的 9 个常见场景

手机打开商品页，主图迟迟不出来。后台点了「导出」，按钮半天没反馈。博客正文已经能读了，上方的图片加载出来，又把正在读的那一段推走。这些问题各自要改的地方不同。

做优化时，可以先录下用户觉得慢的那一步。**内容出来慢，看 LCP 和请求瀑布图。操作后没反馈，看 INP 和主线程。页面突然跳动，看 CLS 和布局偏移记录。** [前端页面性能怎么评估？](/frontend-page-performance) · [Chrome DevTools · Performance](https://developer.chrome.com/docs/devtools/performance/reference)

## 首屏内容迟迟不出来

**1. 手机在下载一张远大于显示尺寸的主图。** 比如商品主图在手机上只显示几百像素宽，页面却给所有设备都发同一张大图。可以用 `srcset` 和 `sizes` 提供不同尺寸，让浏览器选合适的版本。如果主图就是 LCP 元素，让它尽早开始下载。文章下方的配图则可以懒加载。改完看**主图传输了多少数据、什么时候开始请求，以及 LCP 有没有提前**。 [Google · 优化 LCP](https://web.dev/articles/optimize-lcp)

**2. 页面要等几个本可并行的请求。** 比如商品详情和商品评价都能用 URL 里的商品 ID 查询。如果两个请求各自 `await` 完才发下一个，评价就得等详情先回来。两个请求独立时，可以一起发出。

```js
const [product, reviews] = await Promise.all([
  getProduct(productId),
  getReviews(productId),
])
```

如果这些请求发生在浏览器里，可以在 Network 瀑布图里看到它们是否重叠。若请求是在服务端发出的，就看服务端计时。如果评价必须等详情返回另一个 ID，请求就需要按顺序执行。 [Next.js · 并行获取数据](https://nextjs.org/docs/app/getting-started/fetching-data#parallel-data-fetching)

**3. 首页下载了用户暂时用不到的 JS。** 比如后台首页只展示表格，只有点「导出报表」才用到 Excel 库。可以在导出回调里动态 `import()`，把这部分下载和执行延后。第一次导出会多等一次模块加载。改完同时看**首屏 JS 传输量**和**第一次导出的等待时间**。 [Next.js · 按需加载](https://nextjs.org/docs/app/guides/lazy-loading)

## 点击、输入或滚动时卡顿

**4. 搜索框每输入一个字符就发请求。** 比如用户连续输入 `apple`，页面可能发出五次联想请求。可以让输入框即时显示文字，把发请求的动作做防抖，等用户短暂停顿后再发。如果前一次请求还没结束，可以在搜索词改变时取消它，避免旧结果晚回来覆盖当前结果。改完看**一次连续输入发了几次请求，以及停下来后多久能看到建议**。 [MDN · 防抖](https://developer.mozilla.org/en-US/docs/Glossary/Debounce) · [MDN · AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort)

**5. 一次点击在主线程上做了太多计算。** 比如点「生成报表」后，页面同步处理几万条记录，连「正在生成」都来不及显示。可以把计算拆成小批次，在批次之间让浏览器有机会处理输入和绘制。改完录同一次点击，比较**长任务持续了多久，以及用户多久能看到第一帧反馈**。 [Google · 优化长任务](https://web.dev/articles/optimize-long-tasks)

**6. 表格一次渲染了上万行。** 可以用分页减少一次展示的数据。如果产品需要连续滚动，可以用虚拟列表。假设表格有 `10,000` 行，每行高 `40px`，滚动区域高 `400px`。

- 先用占位层撑出 `10,000 × 40 = 400,000px` 的总高度，让滚动条反映整个列表的长度。
- 滚到 `scrollTop = 4,000px` 时，第一条可见数据的下标是 `4,000 ÷ 40 = 100`。此时只渲染下标 `100` 到 `109`，再加上前后少量行作为缓冲。
- 把这些行放到它们在长列表里对应的位置。用户继续滚动时，再根据新的位置更新渲染范围。

一万条数据可以都在内存里，页面实际挂载的却只有几十行，浏览器创建节点和计算布局的工作都少了。如果慢在下载数据，可以另做接口分页。改完看**实际 DOM 节点数和滚动时的帧耗时**。 [Google · 虚拟列表](https://web.dev/articles/virtualize-long-lists-react-window)

**7. 一个小更新带着昂贵的子组件一起渲染。** 比如点「加入购物车」只改了购物车件数，商品列表却重新执行了昂贵的渲染逻辑。可以先用 React DevTools 的 Profiler 确认列表确实耗时，再考虑用 `React.memo`，并保持传入的数组和回调引用稳定。改完比较**同一次加购操作的组件渲染耗时**。 [React · Profiler](https://react.dev/reference/react/Profiler) · [React · memo](https://react.dev/reference/react/memo)

## 页面跳动和重复下载

**8. 图片加载后把正文往下推。** 给图片设置正确的 `width` 和 `height`，或者用 CSS `aspect-ratio` 提前留出空间。浏览器还没下载图片时就能排好位置。改完在 DevTools 的 **Layout shifts** 轨道看原来的偏移记录是否消失，再比较 **CLS**。 [Google · 优化 CLS](https://web.dev/articles/optimize-cls)

**9. 用户再次访问时重复下载相同资源。** 比如构建出的 `app.a1b2.js` 文件名带内容哈希，内容变了就会生成新的文件 URL。这类 JS 和 CSS 可以设较长的缓存时间，让浏览器在再次访问时复用。 [MDN · HTTP 缓存](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

在 Next.js 项目里，这部分通常由构建和部署处理。Next.js 对不可变的生产构建资源默认设置 `Cache-Control: public, max-age=31536000, immutable`。开发模式下，大多数这类资源使用 `no-store`，所以平时跑 `next dev` 时不太容易看到复用效果。可以打开线上页面的 **Network** 面板，取消勾选 **Disable cache**，访问两次，观察同一个 JS 或 CSS 请求的 **Size** 列。显示 `(memory cache)` 或 `(disk cache)` 时，浏览器就复用了本地缓存。 [Next.js · 静态资源缓存](https://nextjs.org/docs/app/guides/self-hosting#caching-and-isr) · [Chrome DevTools · 浏览器缓存](https://developer.chrome.com/docs/devtools/network/reference#emulate-a-first-time-visitor-by-disabling-the-browser-cache)

拿 Next.js 博客来说，如果手机打开文章时正文慢，先确认 LCP 对应的是文字还是图片。**HTML 到了、正文文字却迟迟没显示**，就查字体和渲染时机。**正文很快出现、后来被配图推走**，就检查图片是否预留了空间。改完用同一篇文章、相同的设备模拟、网络和缓存条件复测。
