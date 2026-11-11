---
title: "CSS Flex 布局入门：为什么 flex: 1 还是会溢出？"
description: "从导航栏理解 Flex 的主轴和交叉轴，再用实际对照解释 flex: 1、min-width: 0 和文字省略。"
category: "technology"
date: "2026-11-09"
---

# CSS Flex 布局入门：为什么 `flex: 1` 还是会溢出？

导航栏里，Logo 在左、菜单在右，两边还要垂直对齐。给导航栏设置 `display: flex`，就能用 Flex 的规则排列它的直接子元素。

```css
.header {
  display: flex;
  min-height: 56px;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
```

## 主轴决定排列方向

`flex-direction` 决定主轴方向。通常 `row` 是横排，`column` 是竖排。`justify-content` 沿主轴分配空间，`align-items` 沿交叉轴对齐子项。所以上面的导航栏里，`space-between` 把 Logo 和菜单推向两端，`align-items: center` 让它们垂直居中。换成 `column` 后，`align-items: center` 就变成了水平居中。

`gap` 给子项留出间距，`flex-wrap: wrap` 允许一行放不下时换行。给某个子项设置 `flex: 1`，它就能参与分配剩余空间。

## `flex: 1` 为什么还是会撑出容器？

假设一行宽 `300px`，左侧固定占 `100px`，右侧设置了 `flex: 1`。右侧应该能用剩下的 `200px`，但如果里面有一行无法换行的长标题，它可能还是会撑出去。

原因是横向 Flex 子项的默认 `min-width` 是 `auto`。在常见的情况下，浏览器会根据内容给子项算出一个最小宽度。`flex: 1` 参与分配空间，算出的尺寸仍受这个最小宽度限制。给**需要缩小的 Flex 子项**设置 `min-width: 0`，就可以解除这个限制。[Flexbox 的自动最小尺寸](https://www.w3.org/TR/css-flexbox-1/#min-size-auto)

```html
<div class="row">
  <span class="label">文章</span>
  <div class="content">
    <div class="title">从输入 URL 到页面显示，浏览器经历了哪些步骤？</div>
  </div>
</div>
```

```css
.row {
  display: flex;
  width: 300px;
}

.label {
  flex: 0 0 100px;
}

.content {
  flex: 1;
  min-width: 0;
}

.title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

`min-width: 0` 让 `.content` 的盒子缩到剩余宽度。里面的 `.title` 则用省略号处理放不下的文字。正文也可以选择换行，代码块可以选择横向滚动。

[看修复前后的实际效果](#flex-overflow-demo)。两边的标题都设置了省略号，区别只在右侧 Flex 子项有没有加 `min-width: 0`。
