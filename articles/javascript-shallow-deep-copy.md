---
title: "JavaScript 浅拷贝和深拷贝有什么区别？"
description: "用嵌套对象理解浅拷贝与深拷贝，再看 structuredClone 和递归实现如何复制不同类型的数据。"
category: "technology"
date: "2026-11-09"
---

# JavaScript 浅拷贝和深拷贝有什么区别？

用展开语法复制一个用户对象后，改副本的名字，原对象的名字没变。可如果改的是副本里的城市，原对象也会跟着变。区别在于你修改的是**新对象自己的属性**，还是**两个对象共享的嵌套对象**。

## 浅拷贝只复制外面一层

```js
const user = {
  name: "小明",
  address: { city: "上海" },
};

const copy = { ...user };
copy.name = "小红";
copy.address.city = "北京";

console.log(user.name);                     // 小明
console.log(user.address.city);             // 北京
console.log(copy.address === user.address); // true
```

`{ ...user }` 创建了一个新对象，把 `user` 的属性值复制过去。`name` 的值是字符串，给副本的 `name` 赋值只会改副本。`address` 的值指向一个对象，复制过去后，两个 `address` 仍然指向同一个对象。

数组的 `[...items]` 也一样。数组是新的，里面的对象元素仍然共享。

## 深拷贝会继续复制嵌套对象

如果希望副本有自己的 `address`，可以用 `structuredClone()`。

```js
const deepCopy = structuredClone(user);
deepCopy.address.city = "深圳";

console.log(user.address.city);                // 北京
console.log(deepCopy.address === user.address); // false
```

如果只需要更新地址这一层，也可以直接写 `{ ...user, address: { ...user.address, city: "深圳" } }`。这样只复制要改动的层级。

## 手写深拷贝时，遇到什么就创建什么吗？

对于要复制的对象，大体是这样。**数组要保留元素，`Date` 要保留时间值，`Map` 要保留键和值，`Set` 要保留成员。** 字符串、数字、`null` 等原始值可以直接返回。

```js
function deepClone(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(deepClone);
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof Map) {
    return new Map(
      [...value].map(([key, item]) => [deepClone(key), deepClone(item)])
    );
  }

  if (value instanceof Set) {
    return new Set([...value].map(deepClone));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, deepClone(item)])
  );
}
```

关键是**创建容器之后，还要递归复制它里面的对象**。比如 `Map` 的键和值都可能是对象，因此两边都要调用 `deepClone()`。`Date` 则只需要用原来的时间值创建一个新实例。

这是用于理解原理的简化版，适合由这些类型组成的树状数据。普通对象只复制 `Object.entries()` 取到的属性，循环引用则需要额外记录已经复制过的对象。
