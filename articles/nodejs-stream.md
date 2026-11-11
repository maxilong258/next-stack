---
title: "Node.js Stream 是什么？为什么可以边读边处理？"
description: "用日志压缩示例解释 Node.js 的可读流、转换流、可写流和背压，并介绍文件传输、报表导出和实时响应等常见场景。"
category: "technology"
date: "2026-11-11"
---

# Node.js Stream 是什么？为什么可以边读边处理？

假设你要压缩一个 `500 MB` 的日志文件。用 `readFile()`，程序会先把整个文件读进内存，再开始压缩。用 **Stream（流）**，读到一块数据就可以压缩一块，压缩后的数据也能接着写入文件。整个过程可以在只缓冲一部分数据的情况下完成。 [Node.js Stream 文档](https://nodejs.org/api/stream.html)

这个例子里用到了三种流。

- **可读流（Readable）**负责提供数据，比如 `createReadStream()` 从文件中读出数据。
- **转换流（Transform）**负责加工数据，比如 `createGzip()` 接收原始字节，输出压缩后的字节。
- **可写流（Writable）**负责接收数据，比如 `createWriteStream()` 把数据写到磁盘。

用 `pipeline()` 可以把这三段连起来。把下面的代码保存成 `.mjs` 文件，在包含 `app.log` 的目录中运行。

```js
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'

await pipeline(
  createReadStream('app.log'),
  createGzip(),
  createWriteStream('app.log.gz')
)

console.log('压缩完成')
```

如果磁盘暂时写不过来，写入缓冲区里的数据会逐渐增加。缓冲区达到阈值时，上游会暂停供数据，等下游腾出空间再继续。这套机制叫**背压（backpressure）**，可以避免读得太快、写得太慢，导致数据一直堆在内存里。`await pipeline(...)` 会等整条链路处理完，任一环节出错都会抛出错误。 [Node.js 背压指南](https://nodejs.org/learn/modules/backpressuring-in-streams) · [Node.js pipeline() 文档](https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-options)

## 开发中哪些场景会用到流？

- **大文件上传和下载。** 收到一部分就写入磁盘或转发到对象存储，降低传输阶段的峰值内存。
- **压缩文件或导出报表。** 边读日志边压缩，或者每查到一批数据就转成 CSV 并写出。
- **实时显示结果。** 服务端陆续发出任务进度或生成的文字，浏览器收到一部分就更新页面，用户可以更早看到内容。
