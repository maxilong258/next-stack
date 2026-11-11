---
title: "Node.js 为什么能同时处理很多请求？"
description: "用数据库查询和本地文件读取解释 Node.js 的并发模型，并说明如何用 NestJS 和 BullMQ 运行 I/O 密集型与 CPU 密集型后台任务。"
category: "technology"
date: "2026-11-11"
---

# Node.js 为什么能同时处理很多请求？

平时说 **Node.js 是单线程的**，指的是一个 Node.js 进程默认在主线程上执行应用的 JavaScript。主线程同一时刻只执行一段 JS，但多个请求可以同时在等数据库、网络或文件操作。哪个结果先回来，主线程就有机会先继续处理哪个请求。 [Node.js 事件循环文档](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick#what-is-the-event-loop)

## 等数据库时，主线程可以处理另一个请求

假设两个用户几乎同时打开订单页。请求 A 先到，执行到 `await db.query(...)` 时，查询已经发出，当前函数暂停。等数据库的这段时间里，主线程可以处理请求 B。如果 B 的查询先返回，B 就可以先响应。

```text
主线程  A 发出查询 → B 发出查询 → B 处理结果并响应 → A 处理结果并响应
```

数据库在自己的服务里执行查询。Node.js 通过操作系统监听网络连接，结果回来后，主线程继续执行对应函数里 `await` 后面的代码。**两个查询可以同时在途，两段处理结果的 JS 在主线程上轮流执行。** [libuv 网络 I/O](https://docs.libuv.org/en/v1.x/design.html#the-i-o-loop)

## 读本地文件时，谁去读？

调用 `fs.promises.readFile()` 时，Node.js 把底层文件操作交给 **libuv 线程池**，并返回一个 Promise。池里的工作线程执行文件操作，完成后把结果交回事件循环，主线程再继续执行 `await` 后面的代码。

这个池默认有 **4 个可复用的工作线程**。异步 `zlib.gzip()`、`crypto.pbkdf2()` 和 `dns.lookup()` 也会用到它。是否使用线程池取决于 API 本身。比如 `readFileSync()` 会在主线程上同步等待，给外层函数加上 `async` 也改变不了这一点。 [Node.js 线程池文档](https://nodejs.org/download/release/v22.17.1/docs/api/cli.html#uv_threadpool_sizesize)

## NestJS 适合写后台 Worker 吗？

**适合。NestJS 可以用来组织 API，也可以用来组织独立的后台任务服务。** 比如用户点击「导出报表」，API 把任务放进 BullMQ 队列并返回任务 ID，另一个 Node.js 进程里的 Worker 取出任务。这个 Worker 可以用 `NestFactory.createApplicationContext()` 启动，复用数据库、配置和日志模块，整个服务无需监听 HTTP 端口。 [NestJS 独立应用文档](https://docs.nestjs.com/application-context) · [BullMQ Worker 并发文档](https://docs.bullmq.io/guide/workers/concurrency)

报表任务适合怎样执行，要看时间花在哪里：

- **主要在查数据库、调接口、上传文件**。这些步骤大多在等 I/O，一个 Worker 进程可以交错处理多个任务。
- **主要在做大量 JS 计算**。比如在内存里对几百万条记录做复杂聚合。即使任务放进了队列，这段计算仍会占住执行它的线程。如果直接在队列消费者的主线程上跑太久，连 BullMQ 的任务锁续期都可能被拖延。可以让计算在 `worker_threads` 或 BullMQ 的独立处理进程里执行。 [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html) · [BullMQ 独立处理进程](https://docs.bullmq.io/guide/workers/sandboxed-processors)

所以选 NestJS 时，可以看后台任务是否需要复用应用里的模块和服务。真正影响并发的是任务的执行方式。**入队让 HTTP 请求可以先返回，把计算交给其他线程或进程，才让负责接活的线程腾得出手。**
