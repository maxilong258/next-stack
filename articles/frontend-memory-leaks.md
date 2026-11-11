---
title: "前端内存泄漏怎么定位和处理？从一个报表页说起"
description: "用报表页反复进出的例子，说明如何对比堆快照、追踪对象引用，以及清理事件、定时器、订阅和组件实例。"
category: "technology"
date: "2026-11-10"
---

# 前端内存泄漏怎么定位和处理？从一个报表页说起

有个报表页，每次打开都会创建一张图表，并给 `window` 注册一个 `resize` 监听器。回到首页时，图表已经从页面上消失了，但监听器还在，回调也还引用着那张图表。反复打开和关闭报表页，就可能留下多份已经用不到的图表实例。

这种泄漏的关键是**对象已经没用了，但仍然有一条引用链能访问到它**。页面加载时分配内存很正常。排查时更值得看的是，重复做同一个操作、回到同一状态并回收垃圾后，旧对象是否还在逐轮累积。 [Chrome DevTools · 排查内存问题](https://developer.chrome.com/docs/devtools/memory-problems)

## 用堆快照找出是谁留住了对象

1. **在相同状态下拍两张快照。** 在同一个标签页打开 DevTools 的 **Memory** 面板。先在首页点 **Collect garbage**，再拍第一张 **Heap snapshot**。接着用站内导航反复打开和关闭报表页，例如做 5～10 轮。回到首页，等相关任务结束，再回收一次并拍第二张快照。站内导航能保留同一个页面环境，方便观察旧对象是否累积。
2. **找出没有跟着页面退出而释放的对象。** 打开第二张快照，切到 **Comparison**，与第一张对比。可以先找图表实例、监听回调和 `Detached` DOM。一个 `Detached` 节点已经离开文档，但还有引用指向它。若不确定是首次访问填充了缓存，还是每轮都留下对象，可以再重复一轮对比。 [Chrome DevTools · 快照对比](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#comparison_view)
3. **顺着 `Retainers` 追引用。** 选中可疑对象，在 **Retainers** 看谁引用了它。这个报表页里，可能看到类似 `window → resize 回调 → 图表实例 → 已移除的 DOM` 的引用关系。知道是谁继续持有对象，就能回到注册监听器或保存实例的代码里清理。 [Chrome DevTools · Retainers](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#the_retainers_section)

## 在资源的生命周期结束时清理

以 React 为例，可以把图表创建、事件注册和对应清理放在同一个 Effect。下面的 `createChart` 和 `destroy` 代表所用图表库的创建和销毁方法。

```jsx
useEffect(() => {
  const chart = createChart(containerRef.current, reportData)

  function handleResize() {
    chart.resize()
  }

  window.addEventListener('resize', handleResize)

  return () => {
    window.removeEventListener('resize', handleResize)
    chart.destroy()
  }
}, [reportData])
```

卸载组件时，React 会调用这个清理函数。`reportData` 变化并导致 Effect 重跑时，也会先清理旧实例。移除事件时使用注册时的同一个 `handleResize`。在 Vue 中，组件卸载时的清理可以放在 `onUnmounted()`。 [React · useEffect 清理](https://react.dev/reference/react/useEffect) · [Vue · onUnmounted](https://vuejs.org/api/composition-api-lifecycle.html#onunmounted)

| 常见的残留资源 | 对应处理 |
| --- | --- |
| `window` 或 `document` 上的事件监听器 | 用 `removeEventListener` 移除原来的回调 |
| 定时器或持续运行的动画 | 调用 `clearInterval`、`clearTimeout` 或 `cancelAnimationFrame` |
| 事件总线、消息订阅或 DOM 观察器 | 调用取消订阅函数，或对观察器调用 `disconnect()` |
| 图表、富文本编辑器等第三方实例 | 调用库提供的销毁方法，清除还指向它的外部引用 |
| 一直追加的全局缓存 | 删除过期条目，或限制容量并淘汰旧条目 |

修完后，用相同的站内导航流程再拍快照。比如原来每进出一次报表页，就多留下一份旧图表和一批 DOM。修复后，重点看这些对象的数量是否停止逐轮增加。即使总内存仍会上下波动，也可以用这组对象的变化验证清理是否生效。
