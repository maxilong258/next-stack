---
title: "React useEffect：依赖什么时候检查，回调什么时候执行？"
description: "用页面标题、定时器和 React 19.1.0 源码，解释 useEffect 的依赖比较、执行时机和清理，以及哪些更新会触发组件渲染。"
category: "technology"
date: "2026-11-10"
---

# React `useEffect`：依赖什么时候检查，回调什么时候执行？

假设你在写一个用户主页。页面上的 `<h1>` 可以直接用用户名渲染，但浏览器标签页的标题需要通过 `document.title` 设置。这就是 `useEffect` 的常见用途：**React 提交界面后，用这次渲染的数据同步外部系统。** 浏览器 API、定时器和 WebSocket 都是常见的例子。

```jsx
import { useEffect } from 'react';

function Profile({ name }) {
  const title = `${name} 的主页`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return <h1>{title}</h1>;
}
```

第一次打开页面时，React 提交 `<h1>` 后，Effect 会把标签页标题设为「小明的主页」。后来父组件传来新的 `name`，`Profile` 重新渲染，算出「小红的主页」，Effect 就会在这次提交后更新标签页标题。这里的 `title` 是渲染时算出来的普通变量，它也可以作为依赖。 [React · useEffect](https://react.dev/reference/react/useEffect)

## 依赖数组决定 Effect 什么时候重跑

| 写法 | 回调的执行时机 |
| --- | --- |
| `useEffect(fn)` | 组件每次渲染并提交后执行 |
| `useEffect(fn, [])` | 组件每次挂载并提交后执行 |
| `useEffect(fn, [title])` | 首次提交后执行，之后在 `title` 变化的提交后重跑 |

React 在**组件渲染时**检查依赖。React 19.1.0 的 `updateEffectImpl` 会取出上一轮保存的依赖，用 `areHookInputsEqual` 比较。下面是简化后的源码逻辑。 [React 19.1.0 · updateEffectImpl](https://github.com/react/react/blob/v19.1.0/packages/react-reconciler/src/ReactFiberHooks.js#L2486-L2522)

```js
const prevDeps = currentHook.memoizedState.deps;

if (nextDeps !== null && areHookInputsEqual(nextDeps, prevDeps)) {
  // 依赖相同，本次跳过 Effect
  return;
}

// 标记这个 Effect，在本轮渲染提交后执行
```

`areHookInputsEqual` 用 `Object.is` 逐项比较。每次渲染新建一个 `[title]` 数组没关系，只要里面的字符串相同，就会跳过 Effect。反过来，如果依赖项本身是每次渲染都新建的对象，即使属性内容一样，React 也会把它当作变化。**比较发生在渲染时，回调执行发生在提交后。** 如果一次渲染被丢弃，那一轮的 Effect 就不会执行。 [React · useEffect 依赖比较](https://react.dev/reference/react/useEffect#parameters)

## Effect 返回的函数用来清理什么？

给计数器加一个自动计时功能，`delay` 由父组件传入，`setCount` 来自 `useState`。

```jsx
useEffect(() => {
  const timerId = setInterval(() => {
    setCount(count => count + 1);
  }, delay);

  return () => clearInterval(timerId);
}, [delay]);
```

组件挂载后，Effect 启动定时器。`delay` 从 `1000` 改成 `500` 时，React 先执行旧 Effect 的清理函数，清掉每秒运行一次的定时器，再启动每半秒运行一次的新定时器。组件卸载时，React 会清掉最后一个定时器。

这里用函数形式的 `setCount` 递增计数，Effect 无需读取渲染时的 `count`。所以每次计数变化虽然会让组件重新渲染，但只要 `delay` 没变，定时器就会继续运行。开发环境下，Strict Mode 可能在首次挂载时额外执行一轮「启动 → 清理」，检查两步是否配套。 [React · Effect 的清理与状态更新](https://react.dev/reference/react/useEffect#updating-state-based-on-previous-state-from-an-effect)

## 什么会让 React 有机会检查依赖？

常见的情况有三种：

- **组件自己的状态更新。** 比如定时器调用 `setCount(count => count + 1)`，React 会安排计数器重新渲染。 [React · useState](https://react.dev/reference/react/useState)
- **父组件重新渲染。** 默认情况下，即使父组件传给 `Profile` 的 `name` 没变，`Profile` 也可能再执行一次。此时算出的 `title` 相同，React 检查完就会跳过 Effect。 [React · 渲染与提交](https://react.dev/learn/render-and-commit)
- **组件读取的 Context 变化。** 比如组件通过 `useContext` 读取主题，Provider 切换主题后，组件会重新渲染。如果 Effect 依赖这个主题值，它也会在提交后重跑。 [React · useContext](https://react.dev/reference/react/useContext)

所以平时说 `useEffect`「监听 `title`」，指的是 **React 在渲染时比较 `title`**。单独给普通变量赋值，或修改 `ref.current`，都不会安排重新渲染。即使把这样的值放进依赖数组，那次赋值也不会让 React 立刻来检查。 [React · 可变值与依赖](https://react.dev/learn/lifecycle-of-reactive-effects#can-global-or-mutable-values-be-dependencies)
