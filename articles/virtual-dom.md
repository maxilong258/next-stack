---
title: "为什么使用虚拟 DOM，虚拟 DOM 有什么优势？"
description: "虚拟 DOM 不是因为比真实 DOM 更快才被设计出来的。它的价值是让开发者声明式地写 UI，同时让框架控制和优化 DOM 更新。"
category: "technology"
date: "2026-10-09"
---

# 为什么使用虚拟 DOM，虚拟 DOM 有什么优势？

虚拟 DOM（Virtual DOM，简称 VDOM）是 React 和 Vue 中非常重要的概念。

但有一个常见误区：虚拟 DOM 并不是因为比真实 DOM 更快才被设计出来的。它最大的价值是让开发者以声明式的方式开发 UI，同时让框架能够控制和优化 DOM 更新。

我们从原理开始讲。

## 1. 什么是真实 DOM 和虚拟 DOM？

### 真实 DOM（Real DOM）

真实 DOM 是浏览器维护的一棵对象树，表示网页的实际结构。比如：

```html
<div id="app">
  <h1>Hello</h1>
  <p>Count: 1</p>
</div>
```

浏览器会将其解析为 DOM 树：

```text
div#app
├── h1
│   └── "Hello"
└── p
    └── "Count: 1"
```

你可以直接通过 JavaScript 修改真实 DOM：

```js
document.querySelector("p").textContent = "Count: 2";
```

这会直接修改浏览器中的 DOM 节点。

### 虚拟 DOM（Virtual DOM）

虚拟 DOM 本质上就是 JavaScript 对象，用来描述 UI 应该是什么样子。例如，上面的 HTML 可以抽象成：

```js
const vnode = {
  type: "div",
  props: { id: "app" },
  children: [
    { type: "h1", children: "Hello" },
    { type: "p", children: "Count: 1" }
  ]
};
```

注意，这只是简化示例，并不是 React 或 Vue 完整的 VNode 结构。

虚拟 DOM 本身不会显示在浏览器中，框架需要把它转换为真实 DOM。

## 2. 为什么需要虚拟 DOM？

假设我们开发一个计数器。如果不使用框架：

```js
let count = 0;

function increment() {
  count++;
  document.querySelector("#count").textContent = count;
}
```

这很简单，而且性能很好。但如果页面有 100 个组件，组件之间还有状态依赖呢？开发者就需要自己管理：

- 哪些状态发生了变化？
- 哪些 DOM 节点需要更新？
- 哪些元素需要新增或删除？
- 哪些事件需要重新绑定？
- 如何保持 UI 和数据一致？

虚拟 DOM 配合声明式渲染，就是为了解决这些问题。例如 React：

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>
        Add
      </button>
    </div>
  );
}
```

开发者只需要描述 UI 和状态的关系，不需要手动操作 DOM。React 负责判断哪些地方需要更新。

所以虚拟 DOM 的核心价值是：将 UI 的描述和真实 DOM 操作分离。

## 3. 虚拟 DOM 如何更新真实 DOM？

我们看一个例子。第一次渲染：

```js
const oldVNode = {
  type: "p",
  children: "Count: 1"
};
```

点击按钮之后：

```js
const newVNode = {
  type: "p",
  children: "Count: 2"
};
```

框架比较前后两次的 UI 描述，发现：

- 元素类型还是 `p`
- 只有文本内容发生变化

因此可以复用原来的 `p` 节点，只更新文本。

虚拟 DOM 更新流程（简化）：

```text
旧 VNode                         新 VNode
type: p                          type: p
children: "Count: 1"             children: "Count: 2"
        \                            /
         \                          /
              Diff / 协调
                   |
         类型相同，文本变了
                   |
         复用原来的 p 节点
         只更新文本内容
                   |
               真实 DOM
```

这个过程通常叫做 Diff（比较）和 Reconciliation（协调）。

需要强调：框架不一定真的构造两棵完整的普通 JS 对象树再逐节点比较。React 和 Vue 的实际实现都有更复杂的优化机制。

## 4. 虚拟 DOM 比真实 DOM 快吗？

不一定，很多情况下直接操作真实 DOM 反而更快。例如：

```js
element.textContent = "Hello";
```

与：

```js
setText("Hello");
```

第一种方式直接修改 DOM。第二种方式可能涉及状态更新、组件渲染、协调、提交 DOM 更新等步骤。所以虚拟 DOM 并不天然更快。

| 对比 | 真实 DOM | 虚拟 DOM |
| --- | --- | --- |
| 本质 | 浏览器节点对象 | JS 数据结构 |
| 能否直接显示 | 可以 | 不可以 |
| 修改单个节点 | 通常更直接 | 存在框架开销 |
| 管理复杂 UI | 手动维护成本高 | 更容易声明式管理 |
| 更新控制 | 开发者或其他框架负责 | VDOM 框架负责协调 |
| 内存开销 | DOM 节点本身 | 额外占用 JS 内存 |

另外，真实 DOM 操作也不意味着每次修改都会立即触发完整的重排和重绘。浏览器本身也会进行批处理和优化。

虚拟 DOM 的性能优势主要来自框架对更新过程的管理，而不是 JS 对象比 DOM 节点更快这一点。

## 5. React 和 Vue 都有自己的虚拟 DOM 吗？

是的，而且它们的实现和优化策略有明显区别。

### React：Fiber 架构

React 使用 React Element 描述 UI，并通过 Fiber 架构进行协调和更新。

React Element 可以理解为 UI 的轻量描述，Fiber 则是 React 内部用于管理组件工作、状态和更新的节点结构。

React 的一个重要特点是：组件重新渲染时，React 会重新计算该组件返回的 UI 描述，再进行协调。例如：

```jsx
function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Static Title</h1>
      <p>{count}</p>
    </div>
  );
}
```

当 `count` 改变：

1. React 安排更新。
2. `App` 函数通常重新执行。
3. 生成新的 React Element 描述。
4. React 根据 Fiber 树进行协调。
5. 最终只提交必要的真实 DOM 修改。

注意，组件重新执行不等于真实 DOM 全部重新创建。

Fiber 还有一个重要作用：支持更新优先级、可中断的渲染工作以及并发渲染相关能力。

### Vue：响应式系统 + 编译优化的虚拟 DOM

Vue 3 同样有 VNode 和 Diff 机制，但它结合了细粒度的响应式依赖追踪和编译器优化。例如：

```html
<template>
  <div>
    <h1>Static Title</h1>
    <p>{{ count }}</p>
  </div>
</template>
```

Vue 编译器可以分析出：

- `h1` 是静态内容。
- `p` 的文本依赖 `count`。
- 其他部分没有必要进行动态比较。

编译器会生成优化信息，比如 Patch Flags（补丁标记），帮助运行时更有针对性地更新。因此 Vue 不一定需要对模板中所有节点做同样程度的 Diff。

## 6. React 和 Vue 的区别总结

| 维度 | React | Vue 3 |
| --- | --- | --- |
| UI 描述 | React Element | VNode |
| 核心协调机制 | Fiber Reconciliation | VNode Patch / Diff |
| 状态机制 | useState 等 Hooks | ref / reactive |
| 更新触发 | 状态更新调度组件工作 | 响应式依赖触发更新 |
| 编译优化 | 依赖构建工具及运行时机制 | 模板编译器有较丰富的静态分析 |
| 性能优化 | memo、编译器等 | Patch Flags、静态提升等 |
| 调度机制 | Fiber 调度、优先级 | 响应式任务调度与批量更新 |

不过 Vue 并不是只更新单个发生变化的 DOM 节点而完全不重新运行组件。Vue 的组件渲染函数也可能重新执行，只是其依赖追踪和编译优化能够减少不必要的工作。

## 7. 现代框架一定需要虚拟 DOM 吗？

不需要。例如 Svelte 和 SolidJS，都证明了虚拟 DOM 并不是实现声明式 UI 的唯一方式。它们可以通过编译器或细粒度响应式机制，更直接地确定需要更新的真实 DOM。

这说明：真正重要的是框架如何高效地把状态变化同步到 UI，而不是是否使用虚拟 DOM。

### 虚拟 DOM 真的没有优势了吗？

如果只看状态变化后更新真实 DOM 的效率，SolidJS 和 Svelte 的细粒度响应式方案确实往往更有优势。但是虚拟 DOM 仍有自己的工程价值：

- **运行时灵活性：** 可以用 JavaScript 动态描述复杂 UI，不必完全依赖编译器提前分析依赖关系。
- **声明式协调：** 通过比较前后 UI 描述，统一处理节点的创建、删除、移动和属性变化。
- **渲染与提交分离：** React 可以先计算新的 UI，再决定何时提交变更，便于支持可中断渲染等机制。

不过，这些能力并非虚拟 DOM 独有。无虚拟 DOM 的框架也能通过其他架构实现类似能力。

因此，虚拟 DOM 不是没有价值，而是不再是实现高性能声明式 UI 的必要条件。

### React 为什么不直接抛弃虚拟 DOM？

React 的核心编程模型是：

```text
状态变化
   ↓
组件重新执行
   ↓
产生新的 UI 描述
   ↓
Fiber 协调
   ↓
更新真实 DOM
```

SolidJS 的典型模型是：

```text
状态变化
   ↓
通知依赖该状态的响应式计算
   ↓
直接更新对应的真实 DOM
```

React 如果彻底转向 SolidJS 的模型，就需要重新设计组件执行语义、Hooks、更新调度等核心机制。这不仅是技术改造，还涉及大量现有应用的兼容性。

但也不能说 React 只是被历史包袱困住。React 团队仍然在围绕 Fiber、并发渲染和 React Compiler 等方向发展这套架构。

### React 更流行主要是因为生态吗？

是的，生态和历史先发优势是非常重要的原因。React 2013 年开源，Svelte 2016 年出现，SolidJS 则更晚获得广泛关注。

React 积累了大量开发者、企业项目、组件库、招聘需求和技术资料，形成了网络效应：

```text
开发者多 → 第三方库多 → 企业更愿意使用 → 招聘岗位多 → 更多开发者学习
```

而且 React 本身的组件模型、JSX、单向数据流等设计也帮助了它早期的普及，不能完全归因于生态。

## 我的最终判断

如果今天从零设计一个前端框架，没有充分理由再把虚拟 DOM 当作默认的最佳选择。编译优化和细粒度响应式已经证明，声明式 UI 可以不依赖虚拟 DOM，而且在不少场景下效率更高。

但是，也不能据此断言 React 的整体架构已经落后。渲染效率只是框架设计的一项指标。

可以用一句话概括：SolidJS、Svelte 证明了虚拟 DOM 并非必需；React 则证明了一个框架的长期竞争力，不仅取决于 DOM 更新算法，还取决于编程模型、调度能力、兼容性和生态。
