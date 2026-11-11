---
title: "JavaScript 的 this 由什么决定？"
description: "用方法调用和定时器回调解释 JavaScript 的 this，以及如何使用 call、bind 和箭头函数。"
category: "technology"
date: "2026-11-08"
---

# JavaScript 的 `this` 由什么决定？

一个方法写成 `user.getName()` 时能读到用户名。把它赋给变量，再调用 `getName()`，结果却变成了 `undefined`。函数还是同一个，变的是调用方式。

**普通函数的 `this` 通常由调用方式决定，箭头函数则沿用外层的 `this`。**

## 普通函数看调用方式

```js
"use strict";

const user = {
  name: "小明",
  getName() {
    return this?.name;
  },
};

console.log(user.getName()); // 小明

const getName = user.getName;
console.log(getName()); // undefined
```

`user.getName()` 通过 `user` 调用方法，因此这次调用的 `this` 是 `user`。赋值给变量后，`getName()` 成了一次直接调用。在严格模式下，这时的 `this` 是 `undefined`，所以 `this?.name` 也返回 `undefined`。

如果你希望函数在取出来之后仍然用 `user` 作为 `this`，可以用 `bind`。如果只想在这一次调用里指定 `this`，可以用 `call`。

```js
console.log(getName.call(user)); // 小明，立即调用

const boundGetName = getName.bind(user);
console.log(boundGetName()); // 小明，之后调用也会使用 user
```

执行 `new User()` 时，构造函数里的 `this` 指向新创建的实例，因此可以用 `this.name = name` 给实例设置属性。

## 箭头函数沿用外层的 `this`

比如你希望一个方法等一会儿再打印用户名，可以在方法里面写一个箭头回调。

```js
const account = {
  name: "小明",

  greetLater() {
    setTimeout(() => {
      console.log(this.name);
    }, 100);
  },
};

account.greetLater(); // 稍后输出「小明」
```

调用 `account.greetLater()` 时，方法里的 `this` 是 `account`。箭头函数就在这次方法调用中创建，它沿用的也是这个 `this`。等定时器执行回调时，`this.name` 读到的仍然是 `account.name`。

**把已有方法单独传出去时，可以用 `bind` 固定它的 `this`。在方法内部新写一个回调时，可以用箭头函数沿用当前的 `this`。**
