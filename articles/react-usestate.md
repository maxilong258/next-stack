---
title: "从 React 源码看 useState：为什么 setCount 后读到的还是旧值？"
description: "用一个计数器和 React 19.1.0 的源码选段，理解 useState 如何保存状态、处理更新队列，以及什么时候能读到新值。"
category: "technology"
date: "2026-11-10"
---

# 从 React 源码看 useState：为什么 setCount 后读到的还是旧值？

在 React 里写一个计数器，很容易遇到这种情况。

```jsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    console.log(count); // 第一次点击时打印 0
  }

  return <button onClick={handleClick}>计数：{count}</button>;
}
```

第一次点击后，按钮显示 `1`，控制台却打印 `0`。这是因为 **`count` 属于当前这次渲染，`setCount` 提交的是一次状态更新**。当 React 处理这次更新并重新调用 `Counter`，新一轮渲染才会拿到 `1`。 [React 官方文档 · 状态是一张快照](https://react.dev/learn/state-as-a-snapshot)

## 1. 第一次渲染时，状态存在哪里？

组件函数每次渲染都会重新执行。那 `useState(0)` 为什么没有每次都把计数重置成 `0`？

React 的 `useState` 入口会通过 `dispatcher` 选择当前渲染阶段对应的实现。组件首次渲染走 `mountState`，后续渲染会找到已有的 Hook 记录并读取状态。**`0` 只在初始化时用来设置状态。** [React 19.1.0 · useState 入口](https://github.com/react/react/blob/v19.1.0/packages/react/src/ReactHooks.js)

下面是 React 19.1.0 的 `mountState`，去掉了 Flow 类型标注。

```js
function mountState(initialState) {
  const hook = mountStateImpl(initialState);
  const queue = hook.queue;
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  queue.dispatch = dispatch;
  return [hook.memoizedState, dispatch];
}
```

`mountStateImpl` 创建一条 Hook 记录，把初始值 `0` 存进 `hook.memoizedState`，并创建这个 Hook 的更新队列。返回的数组里，第一个值就是本轮渲染的 `count`，第二个值是绑定好组件和队列的 `setCount`。这里的 `Fiber` 可以理解为 React 为这个组件实例维护的内部记录。 [React 19.1.0 · mountState](https://github.com/react/react/blob/v19.1.0/packages/react-reconciler/src/ReactFiberHooks.js#L1800-L1844)

## 2. `setCount` 为什么改不了当前的 `count`？

源码里的 `bind` 已经给 `dispatchSetState` 提前填了 `fiber` 和 `queue`。所以 `setCount(1)` 可以理解为下面这次调用。

```js
dispatchSetState(fiber, queue, 1);
```

React 由此知道该更新哪个组件的哪个 Hook。它会为更新选择优先级，通常把更新入队并调度渲染。源码里也有提前计算的路径，如果新旧值相同，React 可以跳过调度。 [React 19.1.0 · ReactFiberHooks 源码](https://github.com/react/react/blob/v19.1.0/packages/react-reconciler/src/ReactFiberHooks.js) · [React 官方文档 · useState](https://react.dev/reference/react/useState)

回到计数器，第一次渲染创建的 `handleClick` 通过**闭包**引用了那一次渲染里的 `count`，也就是 `0`。即使 React 已经算出了新值，这个回调读到的依旧是 `0`。如果把日志改成 `setTimeout(() => console.log(count), 1000)`，计时器里的函数捕获的还是同一个 `count`。等一秒只改变了**什么时候读**，读的仍然是那次渲染的值。 [React 官方文档 · 状态是一张快照](https://react.dev/learn/state-as-a-snapshot)

## 3. 为什么连续调用三次，有时只加一次？

React 会批量处理同一个点击事件里的多次状态更新。渲染时，`useState` 通过 `basicStateReducer` 计算更新结果。它的核心逻辑只有一行。 [React 19.1.0 · basicStateReducer](https://github.com/react/react/blob/v19.1.0/packages/react-reconciler/src/ReactFiberHooks.js#L1225-L1228)

```js
return typeof action === 'function' ? action(state) : action;
```

`action` 就是你传给 `setCount` 的参数。直接传值，React 用它替换状态。传入函数，React 把处理到这一步时的状态交给函数，再用函数的返回值作为新状态。

假设 `count` 是 `0`，在同一次点击里执行下面三句，每句都从当前回调里的 `0` 算出 `1`。队列里的三条更新都是“把值设为 `1`”。

```js
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);
// 更新后的 count 是 1
```

换成函数，每个函数都会接到前一条更新算出的结果，三次就能累加起来。

```js
setCount(n => n + 1);
setCount(n => n + 1);
setCount(n => n + 1);
// 0 → 1 → 2 → 3
```

所以，像计数器加一、根据当前数组追加一项这类**依赖前一个状态**的操作，适合写成 `setCount(n => n + 1)` 或 `setItems(items => [...items, newItem])`。像“重置为零”这种目标值已经确定的操作，直接用 `setCount(0)` 就可以。 [React 官方文档 · 排队处理一系列状态更新](https://react.dev/learn/queueing-a-series-of-state-updates)

## 4. 什么时候能读到新值？

- **当前回调里就需要用刚算出的值**，先计算 `const nextCount = count + 1`，再调用 `setCount(nextCount)`。同一个回调里可以直接用 `nextCount`。
- **用新状态生成界面**，直接在组件函数里读 `count`。React 处理这次更新并重新渲染组件时，`useState` 就会返回新值。
- **界面提交后需要根据状态同步外部系统**，比如把计数写入 `localStorage`，可以用依赖为 `[count]` 的 `useEffect`。它会在首次提交后执行，并在之后 `count` 变化的提交后再次执行。 [React 官方文档 · useEffect](https://react.dev/reference/react/useEffect)
