---
title: "浏览器的重排、重绘和合成"
description: "用 FAQ 展开、按钮变色和侧栏滑入理解浏览器渲染，再看如何减少重复布局和页面跳动。"
category: "technology"
date: "2026-11-09"
---

# 浏览器的重排、重绘和合成

展开 FAQ 时，下面的问题会往下移。鼠标悬停在按钮上，按钮会变色。手机上的筛选菜单则可以从右边滑进来，盖在商品列表上。对浏览器来说，这三种变化需要做的工作不同。

## 重排：重新计算元素的大小和位置

点击一个 FAQ 问题后，答案展开，占据了原来没有的空间。浏览器要算出答案区域的新高度，还要重新确定下面几个问题的位置。这就是**重排（Layout，也叫 Reflow）**。

读文章时也可能遇到这种情况：封面图刚加载出来，正在看的段落突然往下跳。如果一开始没有给图片留位置，等图片尺寸确定后，浏览器就得重新摆放后面的内容。给图片写上正确的 `width` 和 `height`，例如 `width="800" height="450"`，可以让浏览器提前按比例留出空间。[避免布局偏移](https://web.dev/articles/optimize-cls)

## 重绘：更新元素的外观

把鼠标移到「提交」按钮上，按钮背景从浅蓝变成深蓝。按钮还在原来的位置，文字也没有重新换行。浏览器可以沿用布局，只更新受影响区域的外观。这就是**重绘（Paint）**。

绘制阶段负责记录要画什么，例如背景、文字和边框。接下来，**栅格化**会把这些绘制指令转换成像素。[Chromium 的绘制与栅格化](https://developer.chrome.com/blog/inside-browser-part3)

## 合成：把已有的像素组合成新的一帧

想象电商页面上的筛选菜单。点击「筛选」后，菜单从右边滑入，盖在商品列表上。用 `transform: translateX(...)` 做这个动画时，如果浏览器能复用已经画好的菜单图层，每一帧只需要调整它的位置，再把它和商品列表组合起来。这就是**合成（Composite）**。淡入淡出用 `opacity` 时，也有机会走同样的路径。

如果设计要求菜单把商品列表**推窄**，商品卡片的宽度和排列可能跟着变，浏览器就需要重新布局。两种侧栏看起来都在移动，但覆盖式侧栏只改变显示位置，推开式侧栏还要给正文重新分配空间。[高性能 CSS 动画指南](https://web.dev/articles/animations-guide)

## 开发中容易踩的坑：改完样式就读尺寸

假设你要把一组卡片改成 `300px` 宽，然后测量文字换行后的高度。如果在循环里每改一张卡片，就立即读取它的 `offsetHeight`，浏览器可能每次都得先算布局，才能给出最新高度。

如果需要的是**所有卡片改完之后的高度**，可以先集中修改，再集中读取：

```js
const cards = [...document.querySelectorAll(".card")];

for (const card of cards) {
  card.style.width = "300px";
}

const heights = cards.map(card => card.offsetHeight);
```

第一次读取高度时，浏览器仍可能需要计算布局。分批处理的价值，是让它有机会把多次修改合在一起算。如果要测的是**改动前**的尺寸，就先集中读取，再修改样式。[避免反复触发布局](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)

遇到实际卡顿时，可以在 Chrome DevTools 的 **Performance** 面板录下那次交互。如果同一段 JavaScript 里反复出现 `Layout`，就检查是不是在循环里交替读写 DOM。如果怀疑一个小变化让大片区域重新画了，可以打开 **Paint Flashing**，直接看哪些区域在闪烁。[布局排查](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing#identify-forced-synchronous-layouts-and-thrashing) · [重绘排查](https://web.dev/articles/animations-guide#check-whether-an-animation-triggers-paint)
