---
title: "Vue 的 computed、watch、watchEffect 怎么选？从一个商品搜索框说起"
description: "用商品搜索页对照普通函数、computed、watch 和 watchEffect，说明如何筛选结果、保存搜索词和同步网页标题。"
category: "technology"
date: "2026-11-10"
---

# Vue 的 `computed`、`watch`、`watchEffect` 怎么选？从一个商品搜索框说起

做一个商品搜索页，用户输入「苹果」时，我们要筛选商品、保存搜索词，还要把网页标题改成「苹果（2 项）」。这三件事都可以写在输入事件里。如果搜索词只从输入框修改，商品列表也不会独立变化，这样写就够了。

```js
import { ref } from 'vue'

const keyword = ref('')
const products = ref(['苹果', '香蕉', '苹果汁'])

function filterProducts() {
  return products.value.filter(name => name.includes(keyword.value))
}

function onInput(event) {
  keyword.value = event.target.value
  localStorage.setItem('lastSearch', keyword.value)

  const results = filterProducts()
  document.title = `${keyword.value || '全部商品'}（${results.length} 项）`
}
```

后来，页面加了一个「清空」按钮，还能从历史记录恢复搜索词，商品列表也改成从接口加载。这时，**输入事件只是变化的一个来源**。点「清空」会改变搜索词，接口返回新商品会改变结果数量，两者都不需要用户在输入框里再打一个字。

## `computed` 负责算出当前的搜索结果

筛选逻辑可以继续用刚才的普通函数，只需要把它交给 `computed`。

```js
import { computed } from 'vue'

const results = computed(filterProducts)
```

同一个函数，放在不同地方，执行时机就不同。

| 写法 | 什么时候计算 |
| --- | --- |
| 在 `<script setup>` 里写 `const results = filterProducts()` | 组件初始化时算一次 |
| 在模板里写 `{{ filterProducts().length }}` | 模板每次执行到这个表达式时都算一次 |
| 写成 `const results = computed(filterProducts)` | 需要结果时计算，依赖没变就复用缓存 |

模板里直接调用普通函数也能响应变化。渲染期间读到的 `keyword` 和 `products` 会被 Vue 追踪。`computed` 多做的一步是**缓存筛选结果**。比如组件只是打开了一个菜单，搜索词和商品都没变，就可以继续使用上次的筛选结果。 [Vue · 计算属性与普通方法](https://vuejs.org/guide/essentials/computed.html#computed-caching-vs-methods)

Vue 2 的 `computed` 已经有这套缓存规则。以前常写 `computed: { results() { ... } }`，这是 Options API。现在的 `computed(filterProducts)` 是 Composition API 的写法，Vue 3 也支持原来的写法。 [Vue 2 · 计算属性缓存](https://v2.vuejs.org/v2/guide/computed.html#Computed-Caching-vs-Methods) · [Vue 3 · 计算属性](https://vuejs.org/guide/essentials/computed.html)

## `watch` 负责在指定的数据变化后做事

保存搜索词这件事只关心 `keyword`，所以可以明确监听它。

```js
import { watch } from 'vue'

watch(keyword, newKeyword => {
  localStorage.setItem('lastSearch', newKeyword)
})
```

输入框可以用 `v-model="keyword"`。清空按钮只需要设置 `keyword.value = ''`，恢复历史搜索时也只需要更新 `keyword`。这几个入口只负责改数据，保存动作由同一个 watcher 处理。默认情况下，`watch` 等监听值变化才调用回调。如果注册时就要先执行一次，可以加 `{ immediate: true }`。 [Vue · watch](https://vuejs.org/api/reactivity-core.html#watch)

如果产品需求是**只有点击「保存搜索」才写入本地存储**，那就把普通函数绑到按钮上。这个动作的触发条件是点击，输入、清空或恢复搜索词时都无需保存。

## `watchEffect` 根据回调实际读取的数据收集依赖

网页标题同时用到了搜索词和结果数量，可以让 Vue 自动追踪这两个值。

```js
import { watchEffect } from 'vue'

watchEffect(() => {
  const title = keyword.value || '全部商品'
  document.title = `${title}（${results.value.length} 项）`
})
```

`watchEffect` 默认先执行一次来设置标题，同时收集它同步读到的响应式依赖。之后，即使用户没有再输入，接口返回新商品、导致筛选结果发生变化时，标题也会随之更新。如果回调是异步函数，Vue 只收集第一次 `await` 之前读取的依赖。 [Vue · watchEffect](https://vuejs.org/guide/essentials/watchers.html#watcheffect)

这里也可以用 `watch` 明确监听 `keyword` 和 `() => results.value.length`。如果你希望标题**只在搜索词或结果数量变化时**更新，这种写法能直接表达条件。用上面的 `watchEffect` 时，回调读取了 `results.value`，所以即使结果数量一样，只要筛选返回了一个新数组，回调也可能再执行一次。 [Vue · watch 与 watchEffect](https://vuejs.org/guide/essentials/watchers.html#watch-vs-watcheffect)
