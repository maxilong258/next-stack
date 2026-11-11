---
title: "JavaScript 闭包如何保留外层变量"
description: "用按钮点击计数理解闭包如何访问外层变量，再看弹窗监听器在什么情况下会造成内存泄漏。"
category: "technology"
date: "2026-11-08"
---

# JavaScript 闭包如何保留外层变量

给按钮绑定点击事件时，注册事件的函数很快就执行完了。用户可能几分钟后才点按钮，回调却依然能访问注册时的局部变量。这就是 JavaScript 的**闭包**。

闭包是函数和它关联的词法环境。这里的「词法」指的是，**函数能访问哪些外层变量，取决于它定义在什么位置**。

## 外层函数返回后，变量为什么还能用？

假设页面上有一个 `<button id="like">点赞</button>`，我们给它加上点击计数。

```js
function bindClickCounter(button) {
  let count = 0;

  button.addEventListener("click", () => {
    count += 1;
    button.textContent = `已点击 ${count} 次`;
  });
}

bindClickCounter(document.querySelector("#like"));
```

调用 `bindClickCounter()` 时，JavaScript 创建了一个局部变量 `count`。点击回调定义在这个函数里面，因此能访问 `count`。`bindClickCounter()` 返回后，按钮仍然持有这个回调。用户点击时，回调可以继续读写那次调用里的 `count`。

第一下点击把 `count` 改成 `1`，第二下接着从 `1` 加到 `2`。**回调每次访问的是同一个变量，所以能读到上一次留下的值。** 如果分别对两个按钮调用 `bindClickCounter()`，每次调用都会创建自己的 `count`，两个按钮就能独立计数。

浏览器处理真实点击时，会派发 `click` 事件并调用监听器。[事件循环](/javascript-event-loop)决定浏览器何时处理点击任务，闭包在回调定义时就已形成，普通的同步函数调用里也能用到。

## 闭包会导致内存泄漏吗？

按钮仍在使用时，保留点击次数是正常的。问题出现在**数据已经用不到，但某个长期存在的回调还引用着它**的时候。

比如弹窗打开时，在 `window` 上注册了一个 `resize` 监听器，回调里引用了弹窗的 DOM。关闭弹窗时，即使把 DOM 从页面移除了，只要监听器还在，这条引用链就还在。

```text
window → resize 回调 → 已移除的弹窗 DOM
```

因此，弹窗销毁时，要用注册时的同一个回调调用 `window.removeEventListener("resize", onResize)`。如果没有其他地方引用弹窗 DOM，它就可以被垃圾回收。遇到类似问题时，可以从仍在运行的监听器、定时器或订阅查起，看看它们还持有哪些已经用不到的数据。
