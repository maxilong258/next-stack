---
title: "手写一个简单的防抖函数"
description: "用搜索框示例手写 JavaScript 防抖函数，解释闭包如何保留定时器，以及如何传递参数、保留 this 和取消等待中的执行。"
category: "technology"
date: "2026-11-10"
---

# 手写一个简单的防抖函数

搜索框里连续输入 `a`、`ap`、`app` 时，可以等用户停下来，再用最后的关键词搜索。比如设定等待时间为 `300ms`，只要这段时间内又有输入，就从头开始计时。这就是**防抖**。

```js
function debounce(fn, delay = 300) {
  let timerId

  function debounced(...args) {
    clearTimeout(timerId)

    timerId = setTimeout(() => {
      timerId = undefined
      fn.apply(this, args)
    }, delay)
  }

  debounced.cancel = () => {
    clearTimeout(timerId)
    timerId = undefined
  }

  return debounced
}
```

## 连续调用时发生了什么？

```js
const search = debounce(keyword => console.log('搜索', keyword))

search('a')   // 安排搜索 a
search('ap')  // 取消搜索 a，重新计时
search('app') // 取消搜索 ap，重新计时

// 从最后一次调用开始等约 300ms，只打印「搜索 app」
```

`debounce()` 只调用一次，返回的 `search` 会通过**闭包**记住同一个 `timerId`。因此，下一次调用能找到并清除上一次的定时器。如果每次输入都重新创建一个防抖函数，每个函数就有自己的 `timerId`，清不到上一次。

定时器触发时，`fn.apply(this, args)` 会把最后一次调用的 `this` 和参数交给原函数。在搜索框的例子里，最后传进去的参数就是 `'app'`。

## `cancel()` 什么时候用？

如果用户离开页面，而搜索还在等定时器，可以调用 `search.cancel()` 取消这次等待。之后再调用 `search()`，仍然可以正常安排下一次执行。如果搜索请求已经发出，就要通过请求本身的取消机制处理。

用在输入框时，**输入框的文字即时更新，只给发搜索请求这一步加防抖**。
