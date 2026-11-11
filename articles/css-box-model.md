---
title: "CSS 盒模型：content-box 和 border-box 有什么区别？"
description: "用宽度计算和卡片溢出示例解释 CSS 盒模型的四层、box-sizing 的默认值，以及 content-box 和 border-box 的区别。"
category: "technology"
date: "2026-11-11"
---

# CSS 盒模型：`content-box` 和 `border-box` 有什么区别？

给一个 `div` 设置 `width: 200px`，再加上左右各 `20px` 的内边距，你在浏览器里看到的盒子可能有 `240px` 宽。原因是默认情况下，`width` 指的是**内容区的宽度**，内边距会另外加上去。这个计算方式由 `box-sizing` 决定。

## 盒模型的四层

从里到外依次是 `content → padding → border → margin`。

| 层 | 作用 |
| --- | --- |
| `content` 内容区 | 放文字、图片等内容的区域 |
| `padding` 内边距 | 内容区到边框之间的空间 |
| `border` 边框 | 包在内边距外面的一圈 |
| `margin` 外边距 | 边框外用来和其他元素拉开距离的空间 |

## `width: 200px` 到底有多宽？

两种设置用同一个盒子来比较。

```css
.box {
  width: 200px;
  padding: 20px;
  border: 2px solid;
}
```

| `box-sizing` | `width: 200px` 包含什么 | 内容区宽度 | 盒子宽度（含边框） |
| --- | --- | --- | --- |
| `content-box` | 内容 | `200px` | `200 + 40 + 4 = 244px` |
| `border-box` | 内容、内边距和边框 | `200 - 40 - 4 = 156px` | `200px` |

这里的 `40px` 是左右内边距之和，`4px` 是左右边框之和。设置 `height` 时，上下内边距和边框也按同样的规则计算。两种模式下，`margin` 都算在盒子外面。

## 为什么 `width: 100%` 还会撑出父容器？

假设父容器的内容区宽 `300px`，卡片设置了 `width: 100%`，左右各有 `16px` 的内边距。

```css
.card {
  box-sizing: border-box;
  width: 100%;
  padding: 0 16px;
}
```

用默认的 `content-box` 时，卡片的内容区已经占了 `300px`，加上内边距后，卡片实际宽 `332px`。设成上面代码里的 `border-box` 后，内边距算在 `300px` 里面，卡片仍宽 `300px`，留给内容的是 `268px`。

## 默认是哪一种？

`box-sizing` 的初始值是 **`content-box`**。普通 `div` 在没有样式覆盖时就用这个值。

有些项目会在全局样式里把元素统一设成 `border-box`，浏览器也会给部分表单控件设置 `border-box`。如果想确认某个元素实际用了哪一种，可以在 DevTools 的 **Computed（计算样式）** 里搜索 `box-sizing`，展开属性查看是哪条规则生效。
