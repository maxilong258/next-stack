---
title: "从输入 URL 到页面显示，浏览器经历了什么？"
description: "先快速梳理页面加载流程，再详细解释 DNS、TCP 和 TLS、HTTP 请求、HTML 解析与浏览器渲染。"
category: "technology"
date: "2026-11-09"
---

# 从输入 URL 到页面显示，浏览器经历了什么？

在地址栏输入 `https://example.com/posts?id=1#comments` 并按回车，浏览器要先拿到文章的 HTML，再把标题、正文和图片画到屏幕上。这两件事可以重叠。HTML 还在下载时，浏览器就能开始解析，并请求已经发现的样式表、脚本和图片。[Chrome 的导航过程](https://developer.chrome.com/blog/inside-browser-part2) · [Chrome 的渲染进程](https://developer.chrome.com/blog/inside-browser-part3)

## 简单解释

```text
解析 URL → DNS 查找 → 建立连接 → HTTP 请求与响应
       → 解析 HTML 和加载资源 → 布局、绘制、合成
```

浏览器从 URL 里读出域名，通过 DNS 找到要连接的 IP，再建立安全连接并发送 HTTP 请求。拿到 HTML 后，浏览器一边解析，一边加载页面需要的资源。当显示当前内容所需的条件具备时，就可以开始绘制。于是，文章标题可能已经出现，图片还在下载，评论区也可能稍后才显示。缓存和已有连接能让浏览器省掉部分网络步骤。[Chrome 的导航与资源加载](https://developer.chrome.com/blog/inside-browser-part2) · [Blink 的渲染流程](https://developer.chrome.com/docs/web-platform/blink)

## 详细解释

### 1. 解析 URL，确定请求目标

| 部分 | 示例 | 用途 |
| --- | --- | --- |
| 协议 | `https` | 使用 HTTPS，省略端口时默认是 `443` |
| 主机名 | `example.com` | 用于查找 IP，也标识要访问的网站 |
| 路径 | `/posts` | 指定要访问的资源 |
| 查询参数 | `id=1` | 随请求发送，服务端可以用它查找对应文章 |
| 片段 | `#comments` | 由浏览器处理，例如滚动到评论区 |

服务器收到的请求目标是 `/posts?id=1`。`#comments` 留在浏览器端，所以已经打开文章时，点击指向评论区的锚点，通常只需要在当前文档里滚动。[HTTP 标准中的请求目标](https://www.rfc-editor.org/rfc/rfc9110.html#section-7.1)

### 2. DNS 查找 IP，浏览器建立连接

浏览器可以先使用已有的 DNS 结果。缓存没有可用记录时，会向配置的递归解析器查询。如果解析器也需要从头找，它通常先问根域名服务器去哪里找 `.com`，再问 `.com` 的服务器谁负责 `example.com`，最后向对应的权威服务器查询 `A` 或 `AAAA` 记录，得到 IPv4 或 IPv6 地址。这个地址可能属于源站，也可能属于 CDN 的边缘节点。[DNS 查询过程](https://www.cloudflare.com/learning/dns/what-is-dns/)

拿到 IP 后，如果没有可复用的连接，浏览器就要建立新连接。**IP 负责让数据包到达目标地址，端口用来区分接收端的服务。** 至于数据怎样可靠传输、怎样加密，则取决于浏览器和服务器使用的协议。

- **HTTPS 上的 HTTP/1.1 和 HTTP/2** 通常先建立 TCP 连接。客户端发 `SYN`，服务器回 `SYN-ACK`，客户端再发 `ACK`。这就是三次握手。TCP 提供可靠、有序的字节流。接着进行 TLS 握手，浏览器检查证书是否可信、域名是否匹配，双方建立加密通信所需的密钥。[TCP 标准](https://datatracker.ietf.org/doc/html/rfc9293#section-3.5) · [TLS 1.3 标准](https://datatracker.ietf.org/doc/html/rfc9846)
- **HTTP/3** 使用运行在 UDP 上的 QUIC。QUIC 集成了 TLS 握手，并支持多个流独立传输。相比 HTTP/2 共用一条有序的 TCP 字节流，一个流的数据丢失时，QUIC 可以让其他流已经收到的数据继续交付。[HTTP/3 标准](https://www.rfc-editor.org/rfc/rfc9114.html#section-2)

### 3. 发送 HTTP 请求，接收主文档

用 HTTP/1.1 的文本格式举例，请求大致是这样：

```http
GET /posts?id=1 HTTP/1.1
Host: example.com
Accept: text/html
```

`GET` 表示获取资源，`Host` 帮助服务器区分同一个 IP 上的多个网站。接收请求的可能是 CDN、反向代理或应用服务器。例如 CDN 有可用缓存时，可以直接返回 HTML。需要回源时，应用服务器可能查数据库，生成文章页面，再把结果返回给浏览器。[HTTP 请求与主机名](https://www.rfc-editor.org/rfc/rfc9110.html#section-7)

浏览器收到响应后，会根据状态码和响应头决定下一步。`200 OK` 可以带回 HTML，`Content-Type: text/html` 表明正文是 HTML。收到带 `Location` 的重定向响应时，浏览器会继续访问新地址。浏览器自己的 HTTP 缓存也会影响这个过程。缓存仍然新鲜时可以直接使用，重新验证时可以带上 `If-None-Match`。如果服务器回复 `304 Not Modified`，浏览器就继续用缓存里的正文。[HTTP 状态码](https://www.rfc-editor.org/rfc/rfc9110.html#section-15) · [HTTP 缓存与重新验证](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.3)

### 4. 解析 HTML，同时加载 CSS、JavaScript 和图片

浏览器把收到的 HTML 字节解码成文本。解析器识别标签和文字，逐步构建 **DOM 树**。例如 `<article><h1>标题</h1></article>` 会形成一个包含标题节点的文章节点。解析时发现 `<link>`、`<script>` 和 `<img>`，浏览器就可以安排相应的资源请求。Chromium 还有预加载扫描器，可以在主解析器被脚本暂停时，提前发现后面的资源。[HTML 解析标准](https://html.spec.whatwg.org/multipage/parsing.html) · [Chromium 的预加载扫描](https://developer.chrome.com/blog/inside-browser-part3)

**阻塞解析和阻塞渲染是两回事。** 普通脚本可能让解析器停下来，因为脚本能读取或修改正在构建的 DOM。适用于当前页面的关键样式表通常会让浏览器推迟初始绘制，因为它需要先用这些 CSS 规则算出元素的样式。[HTML 脚本处理规则](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element) · [Blink 的渲染流程](https://developer.chrome.com/docs/web-platform/blink)

| 脚本写法 | 下载和执行时机 |
| --- | --- |
| `<script src="app.js">` | 解析器通常等脚本下载并执行后再继续 |
| `<script defer src="app.js">` | 并行下载，HTML 解析完后按文档顺序执行 |
| `<script async src="app.js">` | 并行下载，脚本就绪后尽快执行，多个脚本的执行顺序不固定 |
| `<script type="module" src="app.js">` | 默认并行加载模块及其依赖，HTML 解析完后再开始执行 |

### 5. 计算样式，把页面变成像素

假设文章标题的 DOM 节点已经建好，样式表也到达了。浏览器还要决定标题用多大的字体、占多宽、在哪里换行，以及怎么把它画出来。[Blink 的渲染流程](https://developer.chrome.com/docs/web-platform/blink) · [Chromium 的绘制与合成](https://developer.chrome.com/blog/inside-browser-part3)

| 阶段 | 浏览器在做什么 |
| --- | --- |
| **样式计算** | 根据 CSS 的层叠和继承，确定字体、颜色、`display` 等样式 |
| **布局（Layout）** | 计算元素的大小和位置，例如标题在哪里换行、正文从哪里开始 |
| **绘制（Paint）** | 记录要画的文字、背景、边框，以及它们的绘制顺序 |
| **栅格化（Raster）** | 把绘制指令转换成像素 |
| **合成（Composite）** | 把绘制结果组合成最终显示的一帧 |

页面更新时，浏览器可以只重做受影响的阶段。例如，标题字号变大可能让正文往下移，这时需要重新布局。移动一个已有独立合成层的元素时，浏览器有机会复用原来的绘制结果，只更新合成。如果一段 JavaScript 长时间占着主线程，即使 HTML 和 CSS 都已到达，样式计算和布局仍可能被推迟。[Chromium 的合成流程](https://developer.chrome.com/blog/inside-browser-part3) · [HTML 事件循环与渲染](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)

### 6. 看到内容和加载完成是不同的时间点

- **FCP（首次内容绘制）** 记录第一次画出文字、图片等页面内容的时刻。文章标题出现就可能达到 FCP。[W3C Paint Timing](https://www.w3.org/TR/paint-timing/)
- **`DOMContentLoaded`** 在 HTML 解析完成、需要在解析后运行的脚本处理完后触发。普通图片可以继续下载。[HTML 解析结束流程](https://html.spec.whatwg.org/multipage/parsing.html#the-end)
- **`load`** 会等普通图片等会延迟该事件的资源处理完成。之后，页面仍可以继续发起请求，比如滚到评论区时才加载评论。[HTML 加载事件流程](https://html.spec.whatwg.org/multipage/parsing.html#the-end)

在自己的博客上，可以用 Chrome DevTools 的 **Network** 面板看主文档的 **Timing**。它会把 DNS、建立连接、等待响应首字节和下载正文分开。如果 HTML 很快就到了，页面却仍然空白，可以接着看 **Performance** 里的脚本执行、样式计算和布局，判断时间花在了哪一步。[Chrome DevTools 网络耗时说明](https://developer.chrome.com/docs/devtools/network/reference#timing-explanation)
