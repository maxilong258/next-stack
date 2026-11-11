---
title: "React 和 Vue 列表里的 key 有什么用？"
description: "用待办列表示例解释 key 如何保留行组件的状态，并对照 React 和 Vue 源码，说明列表如何匹配、复用和移动节点。"
category: "technology"
date: "2026-11-10"
---

# React 和 Vue 列表里的 `key` 有什么用？

假设你有一个待办列表，每一行都可以输入备注。你在「买菜」下面写了「记得买鸡蛋」，然后在列表顶部插入「取快递」。结果，「记得买鸡蛋」出现在了「取快递」下面。

如果备注存在行组件自己的状态里，这个问题就和列表的 `key` 有关。**`key` 告诉 React 和 Vue，新列表中的这一项对应旧列表中的哪一项。** 框架找到原来的组件后，如果组件类型相同，就可以保留它的状态，再更新内容或移动位置。 [React · 渲染列表](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key) · [Vue · 通过 key 管理状态](https://vuejs.org/guide/essentials/list.html#maintaining-state-with-key)

## 不加 `key`，会把列表全部重建吗？

假设每一行都是同一种 `TodoRow` 组件，列表从 `[买菜, 写博客]` 变成 `[取快递, 买菜, 写博客]`。没有 `key` 时，框架通常按位置配对。

| 位置 | 旧数据 → 新数据 | 框架怎么处理 |
| --- | --- | --- |
| 第 0 行 | 买菜 → 取快递 | 复用原来的第 0 行，更新它的数据 |
| 第 1 行 | 写博客 → 买菜 | 复用原来的第 1 行，更新它的数据 |
| 第 2 行 | 无 → 写博客 | 新建一行 |

原来的两行可能都要更新内容，但它们的组件实例和 DOM 仍然可以复用。「记得买鸡蛋」还存在原来的第 0 行里，而这一行现在显示的是「取快递」。

如果写的是 `key={index}`，这次插入前后，第 0 行的 `key` 都是 `0`，第 1 行的 `key` 都是 `1`，效果也是按位置复用。**待办事项的下标变了，但位置对应的 `key` 没变。** [React · 为什么需要 key](https://react.dev/learn/rendering-lists#why-does-react-need-keys) · [Vue · 列表的就地更新](https://vuejs.org/guide/essentials/list.html#maintaining-state-with-key)

## 用稳定的 ID 标识每一项

把 `key` 放在循环直接生成的元素或组件上，值用这条数据自己的 ID。

```jsx
// React
todos.map(todo => <TodoRow key={todo.id} todo={todo} />)
```

```vue
<!-- Vue -->
<TodoRow v-for="todo in todos" :key="todo.id" :todo="todo" />
```

这次插入「取快递」时，框架会给它创建新的一行。「买菜」和「写博客」虽然到了新位置，但 ID 还是原来的，框架可以认出并复用这两个组件。备注也就继续属于「买菜」。

一个合适的 `key` 在**同一组兄弟项里唯一**，并且**同一条数据在多次渲染之间保持稳定**。数据库 ID 就符合这两个条件。每次渲染都用 `Math.random()` 生成 `key`，框架会把同一条数据识别成新项，重新创建组件，行内暂存的内容也会丢失。 [React · key 的规则](https://react.dev/learn/rendering-lists#rules-of-keys) · [Vue · key API](https://vuejs.org/api/built-in-special-attributes.html#key)

## 源码里的 diff 怎么用 `key`？

下面这次更新同时发生了移动、删除和插入。每个字母都是 `key`，节点类型都相同。

```text
旧列表  [A, B, C, D]
新列表  [D, A, B, E]
```

**React 19.1.0** 的 `reconcileChildrenArray` 先从头匹配。遇到 `A` 和 `D` 对不上，就把剩下的旧节点放进 Map，再按新列表的顺序查找。`D`、`A`、`B` 都能找到旧节点，`E` 需要新建，旧 Map 里剩下的 `C` 要删除。判断移动时，React 先遇到旧下标为 `3` 的 `D`。之后 `A` 和 `B` 的旧下标都小于 `3`，于是给这两项打上移动标记，提交时把它们放到 `D` 后面。 [React · 列表匹配源码](https://github.com/react/react/blob/v19.1.0/packages/react-reconciler/src/ReactChildFiber.js#L1110-L1222) · [React · placeChild](https://github.com/react/react/blob/v19.1.0/packages/react-reconciler/src/ReactChildFiber.js#L420-L448)

**Vue 3.5.13** 的 `patchKeyedChildren` 先从头尾匹配，再用 Map 找出中间部分的新旧对应关系，并卸载找不到对应项的 `C`。按新顺序看，`D`、`A`、`B` 的旧下标分别是 `3`、`0`、`1`。Vue 用最长递增子序列找出无需移动的项，这里是 `0`、`1` 对应的 `A` 和 `B`。接下来，Vue 从后往前处理新列表，先插入 `E`，再把 `D` 移到 `A` 前面。 [Vue · patchKeyedChildren 源码](https://github.com/vuejs/core/blob/v3.5.13/packages/runtime-core/src/renderer.ts#L1681-L1909)

两边都复用了 `A`、`B`、`D`，只是选择移动的节点不同。如果这次 `A` 的标题也从「买菜」改成了「买牛奶」，框架找到原来的 `A` 后，仍然可以更新它的文字，同时保留行组件里的备注。
