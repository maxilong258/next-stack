---
title: "JavaScript 事件循环，从浏览器到 Node.js"
description: "从 Promise 和定时器的输出顺序出发，理解浏览器的微任务检查，以及 Node.js 如何并发处理 HTTP 请求。"
category: "technology"
date: "2026-11-08"
---

# JavaScript 事件循环，从浏览器到 Node.js

`setTimeout(fn, 0)` 明明先写，为什么后面的 Promise 回调却先执行？Node.js 的主线程只有一个，为什么一个接口在等数据库时，另一个接口还能响应？

这两个问题都和当前 JavaScript 什么时候交出执行权，以及运行环境接下来执行什么有关。

## 事件循环是谁提供的？

**JavaScript 语言定义异步代码的行为，宿主环境负责调度。** ECMAScript 定义了 Promise、`async/await` 和 Promise 后续工作如何交给宿主。V8 这样的 JavaScript 引擎负责执行代码，并与宿主配合处理微任务。[ECMAScript 的 Job 调度规则](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-jobs)

浏览器按 HTML 标准实现事件循环，协调点击、定时器和页面渲染。Node.js 则借助 libuv 调度 I/O、定时器等工作。Chrome 和 Node.js 都使用 V8，但它们各自有一套宿主调度机制。[HTML 事件循环](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops) · [Node.js 事件循环](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)

## 为什么 Promise 回调先于定时器？

```js
console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve().then(() => {
  console.log("C");
  queueMicrotask(() => console.log("D"));
});

console.log("E");
```

输出顺序是 **`A → E → C → D → B`**。

1. 当前脚本先执行同步代码，打印 `A` 和 `E`。这期间，它注册了定时器，并把已兑现 Promise 的 `.then()` 回调排入微任务队列。
2. 脚本执行结束后，浏览器进行一次**微任务检查**。打印 `C` 时又加入了一个微任务，所以这次检查还会继续打印 `D`。
3. 微任务队列清空后，定时器回调才有机会执行，打印 `B`。定时器回调属于任务，也常被称为「宏任务」。即使延迟设为 `0`，它也要等宿主调度。[HTML 事件循环处理模型](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model) · [HTML 定时器](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)

这里的「清空」指的是**已经入队的微任务，包括处理期间新加的**。比如一个网络请求还没返回，它的 Promise 仍在等待结果，对应的 `.then()` 回调还没入队。此时定时器完全可以先执行。

## Node.js 怎么用一个 JS 线程处理多个请求？

下面用两秒定时器模拟一次慢查询。把代码保存为 `server.cjs`，运行 `node server.cjs`。

```js
const http = require("node:http");
const { setTimeout: delay } = require("node:timers/promises");

http.createServer(async (req, res) => {
  const path = req.url;

  if (path === "/slow") {
    await delay(2000);
  }

  res.end(`${path} 处理完成\n`);
}).listen(3000);
```

在另一个终端让两个请求同时在途。

```bash
curl localhost:3000/slow &
curl localhost:3000/ping
```

你会先看到 `/ping 处理完成`，约两秒后看到 `/slow 处理完成`。`/slow` 执行到 `await` 时，它的处理函数暂停，事件循环可以调度 `/ping` 的处理函数。等定时器到期、Promise 兑现后，`/slow` 的后半段作为微任务恢复执行。JS 引擎保留了这次函数调用的状态，所以它仍然能读到自己的 `path`。

多个请求可以同时在途，同一个 JS 线程每次执行其中一段代码。Node.js 会按不同阶段调度定时器、I/O 和 `setImmediate` 等回调。它还有独立的 `process.nextTick` 队列，例如在普通 CommonJS 顶层脚本执行完时，这个队列会先于 Promise 微任务处理。[Node.js 事件循环](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick) · [Node.js 的 `nextTick` 与微任务](https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)

如果把 `await delay(2000)` 换成耗时两秒的同步计算，计算会持续占用 JS 线程，期间到达的 `/ping` 只能等它结束。浏览器里也有同样的问题。点击按钮后先把文字改成「加载中」，紧接着做长时间计算，主线程可能直到计算结束才有机会绘制，用户最终直接看到「完成」。排查这类卡顿时，先看代码是在**等待外部结果**，还是在**持续占用线程做计算**。[Node.js 关于阻塞事件循环的说明](https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop)
