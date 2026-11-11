---
title: "用 JavaScript 的 Map 实现 LRU 缓存"
description: "用 Map 的插入顺序实现 LRU 缓存，演示读取、更新和淘汰，并解释经典实现为什么使用双向链表。"
category: "technology"
date: "2026-11-11"
---

# 用 JavaScript 的 Map 实现 LRU 缓存

LRU 是 *Least Recently Used* 的缩写。缓存达到容量上限后，如果再放进一个新条目，就淘汰**最久没被使用**的那一项。

比如缓存只能放两项。先存入 `a` 和 `b`，然后读了一次 `a`。这时再存入 `c`，应该淘汰 `b`。虽然 `a` 更早存入，但刚刚被读过。

## 为什么 `Map` 能记录使用顺序？

JavaScript 规范规定，`Map` 按键的插入顺序遍历。对已有键调用 `set()` 只会更新值。先 `delete()` 再 `set()`，这个键就会被重新插入到末尾。规范保证的是遍历行为，内部数据结构由引擎决定。 [ECMAScript · Map](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects) · [Map.set](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map.prototype.set)

```js
const map = new Map([['a', 1], ['b', 2]])

map.set('a', 3)
console.log([...map.keys()]) // ['a', 'b']

map.delete('a')
map.set('a', 3)
console.log([...map.keys()]) // ['b', 'a']
```

实现 LRU 时，每次读取命中或写入，都把对应的键放到末尾。这样，`Map` 的第一个键就是最久没用的，最后一个键就是最近用过的。

## 手写一个 LRU 缓存

```js
class LRUCache {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new RangeError('capacity 必须是非负整数')
    }

    this.capacity = capacity
    this.cache = new Map()
  }

  get(key) {
    if (!this.cache.has(key)) return undefined

    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)

    return value
  }

  put(key, value) {
    this.cache.delete(key)
    this.cache.set(key, value)

    if (this.cache.size > this.capacity) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
  }
}
```

`get()` 命中时，先取出值，再把键移到末尾。`put()` 写入后如果超出容量，就用 `keys().next().value` 取出第一个键并删除。

```js
const cache = new LRUCache(2)

cache.put('a', 1) // [a]
cache.put('b', 2) // [a, b]

cache.get('a')    // 返回 1，顺序变成 [b, a]
cache.put('c', 3) // 淘汰 b，顺序变成 [a, c]

cache.get('b')    // undefined
```

## 经典实现为什么用双向链表？

经典实现用**哈希表按键查找节点**，用**双向链表记录使用顺序**。查到的节点可能在链表中间。它有 `prev` 和 `next`，所以可以在 `O(1)` 时间内把它摘下来，再挂到尾部。需要淘汰时，直接删除头部节点。

上面的 JavaScript 实现用 `Map` 查找条目并维护使用顺序。双向链表里的「摘下节点，再挂到尾部」，在代码里对应 `delete(key)` 和 `set(key, value)`。
