---
title: "JavaScript 原型链如何查找属性？"
description: "用默认配置理解属性查找，分清 [[Prototype]]、__proto__ 和 .prototype，并列出常见对象和构造函数的原型链。"
category: "technology"
date: "2026-11-09"
---

# JavaScript 原型链如何查找属性？

一个对象自己没有 `language` 属性，为什么读 `settings.language` 还能得到值？因为 JavaScript 读取属性时，可以沿着对象的**原型链**继续查找。

## 先查对象自己，再查它的原型

假设我们有一份默认配置，再创建一份用户配置。用户只改了主题，语言沿用默认值。

```js
const defaults = {
  theme: "light",
  language: "zh-CN",
};

const settings = Object.create(defaults);
settings.theme = "dark";

console.log(settings.theme);    // "dark"
console.log(settings.language); // "zh-CN"
console.log(settings.fontSize); // undefined
```

`Object.create(defaults)` 创建了一个对象，并把 `defaults` 设为它的原型。读取 `theme` 时，JavaScript 在 `settings` 自己身上就找到了值。读取 `language` 时，JavaScript 会到 `defaults` 上找。`fontSize` 在整条链上都找不到，所以结果是 `undefined`。

原型本身也是对象，可以有自己的原型。查找一路往上，找到属性就停止，走到 `null` 就结束。

```text
settings → defaults → Object.prototype → null
```

## 对象的原型从哪里来？

对象内部指向原型的链接叫 **`[[Prototype]]`**。用 `Object.getPrototypeOf()` 可以查看这个链接指向哪里。用 `{}` 创建的普通对象默认指向 `Object.prototype`。用 `Object.create()` 可以直接指定原型，也可以传入 `null`，让查找只在对象自己身上进行。

```js
Object.getPrototypeOf({}) === Object.prototype;      // true
Object.getPrototypeOf(settings) === defaults;        // true
Object.getPrototypeOf(Object.create(null)) === null; // true
```

用 `new` 创建实例时，实例的原型通常来自构造函数的 `.prototype`。比如下面的 `greet` 定义在 `User.prototype` 上，每个实例都可以沿着原型链找到它。

```js
class User {
  greet() {
    return "你好";
  }
}

const user = new User();

Object.getPrototypeOf(user) === User.prototype; // true
Object.hasOwn(user, "greet");                   // false
user.greet();                                  // "你好"
```

`user` 的 `[[Prototype]]` 是实例内部的链接，`User.prototype` 是 `User` 上的一个属性，两者都指向存放 `greet` 的那个原型对象。`__proto__` 则是许多对象从 `Object.prototype` 继承的一个访问器。读取 `user.__proto__` 时，它会返回 `user` 的原型。用 `Object.getPrototypeOf()` 查看原型更直接，也适用于 `Object.create(null)` 创建的对象。

## 常见对象的原型链

下面每条链都从示例对象的**直接原型**开始。

| 示例 | 原型链 |
| --- | --- |
| `{}` | `Object.prototype → null` |
| `[]` | `Array.prototype → Object.prototype → null` |
| 普通函数、箭头函数 | `Function.prototype → Object.prototype → null` |
| `new User()` | `User.prototype → Object.prototype → null` |
| `new Date()` | `Date.prototype → Object.prototype → null` |
| `/abc/` | `RegExp.prototype → Object.prototype → null` |
| `new Map()` | `Map.prototype → Object.prototype → null` |
| `new Set()` | `Set.prototype → Object.prototype → null` |
| `Promise.resolve()` | `Promise.prototype → Object.prototype → null` |
| `new TypeError()` | `TypeError.prototype → Error.prototype → Object.prototype → null` |

字符串、数字、布尔值、BigInt 和 Symbol 是**原始值**。访问它们的属性时，JavaScript 按相应包装对象的规则查找，可以分别在 `String.prototype`、`Number.prototype`、`Boolean.prototype`、`BigInt.prototype` 和 `Symbol.prototype` 上找到方法。这些原型再往上都是 `Object.prototype → null`。例如，`"abc".toUpperCase()` 用的是 `String.prototype` 上的方法。对 `null` 或 `undefined` 直接读取属性则会抛出 `TypeError`。

## 构造函数自己也有原型链

`Object`、`Function`、`Array`、`String`、`Number`、`Boolean`、`Date`、`RegExp`、`Map`、`Set`、`Promise` 和 `Error` 本身都是函数对象。它们的直接原型是 `Function.prototype`。以 `Array` 为例，这和数组实例的原型链是两条不同的链。

```text
构造函数 Array → Function.prototype → Object.prototype → null
数组实例 []   → Array.prototype    → Object.prototype → null
```

有继承关系时，构造函数的链会多一层。`TypeError` 的直接原型是 `Error`。同样，`class Admin extends User {}` 让 `Admin` 的直接原型指向 `User`，让 `Admin.prototype` 的直接原型指向 `User.prototype`。因此，静态方法沿构造函数的链查找，实例方法沿实例的链查找。
