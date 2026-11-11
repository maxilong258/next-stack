---
title: "Node.js 的任务执行顺序：nextTick、Promise 和定时器"
description: "用 CommonJS、ES 模块和文件读取示例解释 Node.js 中 nextTick、Promise 微任务、setTimeout、setImmediate 和 I/O 回调的执行顺序。"
category: "technology"
date: "2026-11-11"
---

# Node.js 的任务执行顺序：`nextTick`、Promise 和定时器

同一段代码里调用 `process.nextTick()`、`Promise.then()` 和 `setTimeout()`，它们的回调会在不同的时机执行。理解顺序时，先看**当前有哪些同步代码在跑，再看每个回调被放进了哪里**。

## 先看一段代码

把下面的代码保存成 `demo.cjs`，用 Node.js 运行。

```js
console.log('1. 开始')

setTimeout(() => console.log('5. 定时器'), 0)
Promise.resolve().then(() => console.log('4. Promise'))
process.nextTick(() => console.log('3. nextTick'))

console.log('2. 结束')
```

输出是 **开始 → 结束 → nextTick → Promise → 定时器**。虽然代码最先注册了定时器，它却最后执行。

| 写法 | 回调什么时候执行 |
| --- | --- |
| `console.log()` | 同步执行，按代码顺序运行 |
| `process.nextTick(fn)` | 进入 Node.js 的 next tick 队列，等当前同步代码跑完后处理 |
| `promise.then(fn)`、`queueMicrotask(fn)` | Promise 兑现后，对应的 `then` 回调进入微任务队列。`queueMicrotask()` 直接把回调加入同一个队列，`await` 后续代码也通过微任务恢复 |
| `setTimeout(fn, delay)` | 等待时间达到阈值后，在事件循环处理定时器时执行 |

在这个 **CommonJS 顶层**例子里，同步代码结束后，Node.js 先处理 next tick 队列，再处理 Promise 微任务。如果把同一段代码放到 `.mjs` 文件顶层，`Promise` 会先于 `nextTick`，因为 ES 模块的顶层代码本身就在微任务处理中执行。 [Node.js 关于 next tick 与微任务的说明](https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)

## I/O 回调和 `setImmediate()` 又排在哪？

比如调用 `fs.readFile()` 读取文件，读完后，事件循环会安排执行读取回调。下面的代码在这个回调里同时注册 `setImmediate()` 和 `setTimeout(fn, 0)`。

```js
const fs = require('node:fs')

fs.readFile(__filename, () => {
  setTimeout(() => console.log('定时器'), 0)
  setImmediate(() => console.log('immediate'))
})
```

这里会先打印 `immediate`，再打印 `定时器`。因为从这个 I/O 回调出来后，事件循环会先到处理 `setImmediate()` 的 **check 阶段**。如果把这两个调用移到文件顶层，先后顺序就可能变化。 [Node.js 关于 setImmediate 与 setTimeout 的说明](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick#setimmediate-vs-settimeout)

## 平时开发怎么遇到这些任务？

- **查数据库、调接口**时常用 `await`。等待期间，Node.js 可以处理别的请求。结果回来后，当前函数从 `await` 后面继续执行。
- **延迟重试**时可以用 `setTimeout()`。等待时间到了，回调还得等事件循环有机会执行，所以实际等待可能更久。
- **写回调式 API 或事件库**时，可能用 `process.nextTick()` 让调用方先跑完同步代码。例如先返回对象，让调用方注册监听器，再发出 `ready` 事件。如果只需要把回调延后到同步代码之后，Node.js 文档建议优先考虑 `queueMicrotask()`。 [Node.js API 文档](https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)
