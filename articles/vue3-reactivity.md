---
title: "Vue 3 响应式原理：从 state.count++ 到页面更新"
description: "用计数器和 Vue 3.5.13 源码解释依赖收集、更新调度、ref 与 nextTick，并用简易发布订阅示例对照 track 和 trigger。"
category: "technology"
date: "2026-11-10"
---

# Vue 3 响应式原理：从 `state.count++` 到页面更新

在 Vue 里执行 `state.count++`，紧接着读 `state.count`，拿到的是新值。如果这时去读按钮上的文字，看到的却可能还是旧值。这次赋值会**立即修改数据，再通知 Vue 安排组件更新。**

用一个计数器可以直接看到这两个时机。第一次点击时，下面三行日志会依次输出 `1`、`"0"`、`"1"`。 [Vue · nextTick](https://vuejs.org/api/general.html#nexttick)

```vue
<script setup>
import { nextTick, reactive, ref } from 'vue'

const state = reactive({ count: 0 })
const button = ref(null)

async function increment() {
  state.count++

  console.log(state.count)               // 1，数据已经变了
  console.log(button.value.textContent)  // "0"，DOM 还没更新

  await nextTick()

  console.log(button.value.textContent)  // "1"，DOM 已更新
}
</script>

<template>
  <button ref="button" @click="increment">{{ state.count }}</button>
</template>
```

## 读取属性时，Vue 怎么知道哪个组件依赖它？

`reactive()` 返回一个 `Proxy`。第一次渲染按钮时，模板会读取 `state.count`，触发代理的 `get`。下面是 **Vue 3.5.13** 普通属性读取路径的简化代码。 [Vue · 创建 Proxy](https://github.com/vuejs/core/blob/v3.5.13/packages/reactivity/src/reactive.ts#L255-L288) · [Vue · get 拦截](https://github.com/vuejs/core/blob/v3.5.13/packages/reactivity/src/baseHandlers.ts#L55-L133)

```js
const value = Reflect.get(target, key, receiver)
track(target, TrackOpTypes.GET, key)
return value
```

此时，Vue 正在一个 `ReactiveEffect` 里执行组件的渲染逻辑。执行前，它把这个 effect 设为当前订阅者 `activeSub`。所以 `track()` 被调用时，Vue 知道**谁在读**，也知道**读的是哪个对象的哪个属性**。 [Vue · ReactiveEffect.run](https://github.com/vuejs/core/blob/v3.5.13/packages/reactivity/src/effect.ts#L140-L170)

这层关系存在 `targetMap` 里。外层 `WeakMap` 用**原始对象**做键，内层 `Map` 用**属性名**做键。每个属性对应的 `Dep` 管理订阅它的 effect。 [Vue · targetMap 和 track](https://github.com/vuejs/core/blob/v3.5.13/packages/reactivity/src/dep.ts#L219-L261)

```text
原始对象 { count: 0 }
  └─ "count"
       └─ Dep
            └─ 计数器组件的渲染 effect
```

如果组件还读了 `state.name`，Vue 会另外登记一条 `name` 的依赖。组件实际读了哪些属性，就决定了哪些属性的变化能通知它。

## 写入属性后，为什么 DOM 要等一下？

`state.count++` 会先读出旧值，再写入新值。写入经过代理的 `set`。对于已有的普通属性，Vue 写入后比较新旧值，发现变化就调用 `trigger()`。`trigger()` 用同一个对象和属性名查到 `count` 的 `Dep`，再通知订阅它的渲染 effect。 [Vue · set 拦截](https://github.com/vuejs/core/blob/v3.5.13/packages/reactivity/src/baseHandlers.ts#L136-L175) · [Vue · trigger](https://github.com/vuejs/core/blob/v3.5.13/packages/reactivity/src/dep.ts#L270-L299)

组件渲染 effect 的调度器是下面这一行。 [Vue · 组件渲染 effect](https://github.com/vuejs/core/blob/v3.5.13/packages/runtime-core/src/renderer.ts#L1482-L1494)

```js
effect.scheduler = () => queueJob(job)
```

`queueJob()` 把组件更新放进队列。如果在同一个点击回调里连写两次 `state.count++`，数据会先后变成 `1`、`2`，同一个组件的更新任务则会去重。Vue 随后渲染组件，再把按钮文字更新成 `2`。 [Vue · 更新队列](https://github.com/vuejs/core/blob/v3.5.13/packages/runtime-core/src/scheduler.ts#L86-L109)

如果是**改完状态后立刻要操作 DOM**，比如显示输入框后聚焦，用 `await nextTick()` 就可以。若希望**响应某个值的变化，并在当前组件的 DOM 更新后运行回调**，可以用 `watch` 并指定 `flush: 'post'`。把下面的 watcher 加到计数器的 `<script setup>` 里，就能在 DOM 更新后读取按钮文字。 [Vue · Watcher 的执行时机](https://vuejs.org/guide/essentials/watchers.html#callback-flush-timing)

```js
import { watch } from 'vue'

watch(
  () => state.count,
  () => console.log(button.value.textContent),
  { flush: 'post' }
)
```

Vue 还有一个在执行时机上接近 React `useEffect` 的 API，叫 `watchPostEffect()`。它会在组件 DOM 更新后运行，并自动追踪回调同步执行时读取的响应式数据。 [Vue · watchPostEffect](https://vuejs.org/api/reactivity-core.html#watchposteffect)

## `ref()` 也用同一套依赖机制

`ref(0)` 返回一个带 `.value` 的对象，这个对象自己持有一个 `Dep`。读 `.value` 时，getter 调用 `this.dep.track()`。写入不同的值时，setter 调用 `this.dep.trigger()`。`reactive` 把收集和通知放在代理的属性读写里，`ref` 把它们放在 `.value` 的 getter 和 setter 里。 [Vue · RefImpl 源码](https://github.com/vuejs/core/blob/v3.5.13/packages/reactivity/src/ref.ts#L101-L149)

这也解释了为什么 `const { count } = state` 容易踩坑。这里取出来的是当时的数字。模板之后如果只读这个局部变量，就不会再经过 `state.count` 的代理 getter，也就读不到它的后续变化。 [Vue · 深入响应式原理](https://vuejs.org/guide/extras/reactivity-in-depth.html#how-reactivity-works-in-vue)

## 用一段发布订阅代码理解 `track` 和 `trigger`

这个发布订阅示例用一张表记录每个事件有哪些订阅者。

```js
const events = new Map()

function subscribe(event, handler) {
  if (!events.has(event)) {
    events.set(event, new Set())
  }

  const handlers = events.get(event)
  handlers.add(handler)
  return () => handlers.delete(handler)
}

function publish(event, value) {
  for (const handler of events.get(event) ?? []) {
    handler(value)
  }
}

const unsubscribe = subscribe('countChanged', value => {
  console.log('计数变成了', value)
})

publish('countChanged', 1) // 计数变成了 1
unsubscribe()
publish('countChanged', 2) // 没有订阅者，不打印
```

这个例子用事件名查订阅者，Vue 则用**对象和属性名**查。这里由我们手动调用 `subscribe()`，Vue 在组件渲染读取 `state.count` 时自动登记。这里的 `publish()` 会同步执行订阅回调，Vue 通知渲染 effect 后，会由调度器把组件更新放进队列。
