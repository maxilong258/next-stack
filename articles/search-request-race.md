---
title: "搜索框连续输入时，怎么避免旧请求覆盖新结果？"
description: "用 React 搜索框解释请求竞态，结合请求编号、AbortController 和防抖，保证只有最新输入对应的结果能更新页面。"
category: "technology"
date: "2026-11-10"
---

# 搜索框连续输入时，怎么避免旧请求覆盖新结果？

用户先输入 `app`，接着补成 `apple`。两个搜索请求都发出去了，但 `apple` 的结果先回来，`app` 的结果后回来。如果每个响应回来时都直接更新列表，输入框明明显示着 `apple`，下面却可能变回 `app` 的结果。

这就是**请求竞态**。网络响应的返回顺序可能和发送顺序不同。给每次输入一个编号，就能让**只有最新输入对应的请求更新页面**。 [React · 请求竞态](https://react.dev/reference/react/useEffect#fetching-data-with-effects)

## 给每次输入编号，再取消旧请求

在 React 组件里，可以用 `useRef` 保存最新编号和上一次请求的 `AbortController`。下面的 `search()` 在输入框的 `onChange` 中调用，`setResults` 和 `setError` 是组件的状态更新函数。

```jsx
const latestId = useRef(0)
const activeRequest = useRef(null)

async function search(input) {
  const id = ++latestId.current
  activeRequest.current?.abort()
  setError(null)

  const query = input.trim()

  if (!query) {
    activeRequest.current = null
    setResults([])
    return
  }

  const controller = new AbortController()
  activeRequest.current = controller

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`搜索失败：${response.status}`)

    const results = await response.json()
    if (id === latestId.current) setResults(results)
  } catch (error) {
    if (id === latestId.current && !controller.signal.aborted) {
      setError(error)
    }
  }
}
```

**编号决定谁能写入结果，`abort()` 负责停止客户端仍在处理的旧请求。** 只做编号检查，也能避免旧结果覆盖新结果。加上取消后，浏览器还可以停止等待旧响应或读取响应体。客户端取消请求后，服务端已经开始的工作不一定会随之停止。 [MDN · 取消 Fetch 请求](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#canceling_a_request)

这里连**清空输入框**也会先更新编号。否则用户刚清空列表，上一个请求回来时，又可能把旧结果填进去。错误提示也检查编号，避免旧请求失败后，给已经显示新结果的页面挂上一条错误提示。

## `AbortController` 是谁提供的？还有别的取消方式吗？

`AbortController` 是 WHATWG DOM 标准定义的 Web API，浏览器原生提供，现代 Node.js 也有同名 API。它的 `signal` 可以交给支持取消的 API。调用 `abort()` 时，使用这个信号的 API 就能收到取消通知。 [WHATWG · AbortController](https://dom.spec.whatwg.org/#interface-abortcontroller) · [Node.js · AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)

| 请求方式 | 怎么取消 |
| --- | --- |
| 原生 `fetch` | 传入 `signal`，再调用 `controller.abort()`。 [MDN · Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#canceling_a_request) |
| Axios | 同样可以传入 `signal`。旧代码里的 `CancelToken` 已经弃用。 [Axios · 请求取消](https://axios.rest/pages/advanced/cancellation) |
| 原生 `XMLHttpRequest` | 调用请求对象自己的 `xhr.abort()`。 [WHATWG · XHR](https://xhr.spec.whatwg.org/#the-abort()-method) |

## 加了防抖，还需要检查编号吗？

需要。防抖解决的是**发几次请求**，编号解决的是**哪次结果可以显示**。

比如设置了 `300ms` 防抖。用户刚把 `app` 改成 `apple`，新的请求还在等这 `300ms`，之前已经发出的 `app` 请求却可能在这段时间回来。**编号要在输入变化时立即更新，防抖只延后发请求这一步。** 这样从用户输入 `apple` 的那一刻起，`app` 的结果就已经失效了。
