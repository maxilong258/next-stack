---
title: "前端页面性能怎么评估？拿一个 Next.js 博客来说"
description: "用 Next.js 博客解释 LCP、CLS、INP 和 P75，手算一次布局偏移，并用 PageSpeed Insights 和 Chrome DevTools 排查首屏与站内导航。"
category: "technology"
date: "2026-11-10"
---

# 前端页面性能怎么评估？拿一个 Next.js 博客来说

平时打开自己的博客，正文很快就出来，点文章也没觉得卡。但自己用的往往是同一台设备、同一个网络，浏览器可能还缓存了字体和脚本。第一次从手机打开文章的读者，体验可能不同。

对一个以阅读为主的博客，我会先看正文多久能看到、阅读时页面会不会跳，以及从首页点进文章要等多久。

## 看哪些指标？

| 指标 | 在博客里看什么 | 良好阈值 |
| --- | --- | --- |
| **LCP**（最大内容绘制） | 直接打开文章，首屏最大的内容元素多久显示出来，比如一大段正文或封面图 | ≤ 2.5 秒 |
| **CLS**（累计布局偏移） | 页面加载或阅读过程中，标题、正文、代码块有没有突然挪位置 | ≤ 0.1 |
| **INP**（交互到下一次绘制） | 点击主题按钮、操作文章里的交互示例后，浏览器多久能绘制反馈 | ≤ 200 毫秒 |

线上通常分别看移动端和桌面端的 **P75**。比如有 100 次移动端访问，把各次访问的 LCP 从快到慢排序，第 75 次是 `2.5 秒`，那么 P75 就是 `2.5 秒`。这表示约四分之三的访问能在这个时间内看到首屏主要内容。 [Google · Web Vitals](https://web.dev/articles/vitals)

博客还可以单独测量**从首页点一篇文章，到文章标题显示出来的时间**。点击后立刻出现一个加载提示，说明页面很快给了反馈，但读者可能还要继续等正文。INP 衡量的是交互到下一次绘制的延迟，打开文章的完整耗时可以另外记录。 [Google · INP](https://web.dev/articles/inp)

## CLS 怎么算？拿一张把正文推下去的图片举例

假设你已经在读正文，上方一张没预留高度的图片加载出来，把正在读的内容往下推了 `100px`。浏览器比较相邻两帧，发现这块原本可见的正文改变了位置，就会记录一次布局偏移。

**单次偏移分数 = 受影响面积占比 × 移动距离占比。** 假设视口宽 `500px`、高 `1000px`，正文铺满宽度，原来位于 `y=200` 到 `600`，移动后位于 `y=300` 到 `700`。

- **受影响面积占比是 `0.5`。** 移动前后的可见区域合起来覆盖 `y=200` 到 `700`，重叠部分只算一次，正好占视口面积的一半。
- **移动距离占比是 `0.1`。** 正文移动了 `100px`，除以视口较长的一边 `1000px`。
- **这次偏移得 `0.05`**，也就是 `0.5 × 0.1`。 [Google · 布局偏移计分规则](https://web.dev/articles/cls#layout_shifts_in_detail)

一次访问可以发生多次偏移。计算 CLS 时，相邻偏移间隔小于 `1 秒`的事件可以归在同一组，每组最多持续 `5 秒`。**把每组的分数相加，再取分数最高的一组。** 比如一组是 `0.05 + 0.04`，另一组是 `0.06`，这次访问的 CLS 就是 `0.09`。点击、轻触或按键后 `500ms` 内发生的偏移通常会被排除，比如用户点开折叠面板后，正文随面板展开往下移。 [Google · CLS 的分组与计分](https://web.dev/articles/cls)

## 怎么测自己的页面？

直接打开文章和从首页点进去，是两个不同的场景。可以用这个博客的首页和《为什么使用虚拟 DOM》文章页做一组对照。 [线上博客首页](https://next-stack-ten.vercel.app/) · [文章页](https://next-stack-ten.vercel.app/virtual-dom)

1. **直接打开文章，测首屏。** 用 PageSpeed Insights 跑移动端报告。如果有真实用户数据，先看 LCP、CLS 和 INP 的 P75。如果样本不足，可以先用 Lighthouse 的模拟结果做基线。 [Google · PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/about)
2. **录一次加载，找出内容为什么慢。** 在 Chrome DevTools 的 **Performance** 面板录制并重新加载。选中 LCP 事件，确认它对应哪个元素。再看 **Network** 瀑布图，判断是 HTML 首字节来得晚，还是 HTML 已经到了，字体或首屏图片还在等。 [Chrome DevTools · 分析性能记录](https://developer.chrome.com/docs/devtools/performance/reference)
3. **找到页面跳动的位置。** 在 **Layout shifts** 轨道点紫色菱形，查看偏移分数和受影响的元素。工具可能标出被推开的正文，真正触发偏移的则是上方刚加载的图片。 [Chrome DevTools · 查看布局偏移](https://developer.chrome.com/docs/devtools/performance/reference#view-layout-shifts)
4. **录一次站内导航。** 从首页开始录制，点一篇文章，用性能记录里的截图观察从点击到标题出现的时间。这段操作可以单独和直接打开文章的结果对比。 [Chrome DevTools · Performance](https://developer.chrome.com/docs/devtools/performance/reference)

比如录制确认封面图把正文推下去了，就给图片预留尺寸，然后用**同一篇文章、相同的网络和缓存条件**再录几次。看原来的偏移记录有没有消失、CLS 有没有下降，就能验证这次改动的效果。
