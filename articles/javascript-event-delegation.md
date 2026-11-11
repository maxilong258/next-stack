---
title: "JavaScript 事件委托：一个监听器处理整个列表"
description: "用商品列表的删除按钮解释事件冒泡、target、currentTarget 和 closest，以及如何处理动态添加的元素。"
category: "technology"
date: "2026-11-11"
---

# JavaScript 事件委托：一个监听器处理整个列表

假设一个商品列表有 100 行，每行都有一个「删除」按钮。如果给每个按钮单独绑定点击事件，新增一行时还得给新按钮绑定一次。用**事件委托**，只需要给列表绑一个 `click` 监听器，就能处理现有和后来添加的按钮。

## 为什么列表能收到按钮的点击？

因为 `click` 会**冒泡**。如果按钮里有一个 `<span>`，点到文字时，事件会从这个 `<span>` 向上传递，经过 `button`、`li`，最后到达 `ul`。

在 `ul` 的监听器里，两个属性分别指向不同的元素。

- `event.target` 是点击发生的地方，这里是 `<span>`。
- `event.currentTarget` 是当前执行的监听器绑定的元素，这里是 `<ul>`。

## 用事件委托实现列表删除

```html
<ul id="list">
  <li>苹果 <button type="button" class="delete"><span>删除</span></button></li>
  <li>香蕉 <button type="button" class="delete"><span>删除</span></button></li>
</ul>
```

```js
const list = document.querySelector('#list')

list.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return

  const button = event.target.closest('button.delete')
  if (!button || !list.contains(button)) return

  button.closest('li')?.remove()
})
```

`closest('button.delete')` 会从点击位置开始，沿着 DOM 向上找匹配的按钮。点到 `<span>` 时，它能找到外层的按钮。点到「苹果」时，沿途找不到删除按钮，监听器就直接返回。`list.contains(button)` 则把处理范围限制在这个列表里。

## 新增一行为什么也能删除？

绑定监听器后，可以用下面的代码添加一行。

```js
list.insertAdjacentHTML(
  'beforeend',
  '<li>橙子 <button type="button" class="delete">删除</button></li>'
)
```

「橙子」的删除按钮出现后就能用。它的点击事件同样会冒泡到 `ul`，由之前绑定的监听器处理。搜索结果、购物车、动态表格都可以用这种方式处理行内操作。

这个写法依赖事件冒泡。如果某个子元素在事件到达列表前调用了 `event.stopPropagation()`，列表上的监听器就收不到这次点击。
