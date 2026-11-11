---
title: "TypeScript 常用类型入门"
description: "用日常代码示例介绍 TypeScript 的常用类型、类型收窄，以及 Promise 泛型如何描述异步结果。"
category: "technology"
date: "2026-11-09"
---

# TypeScript 常用类型入门

写 JavaScript 时，给一个变量赋值 `0`，稍后还可以把它改成字符串 `"1"`。TypeScript 会提前检查这种变化。

```ts
let count = 0; // TypeScript 推断 count 是 number
count = "1";   // 类型错误，string 不能赋给 number
```

这里没有手写类型，TypeScript 也能从初始值推断出来。实际开发中，类型尤其适合用来描述函数接收什么参数、对象有哪些字段，以及接口会返回什么数据。

## 从数字到对象，常见类型怎么写？

| 类型 | 写法 | 含义 |
| --- | --- | --- |
| 原始类型 | `string`、`number`、`boolean` | 字符串、数字、布尔值。还有 `bigint`、`symbol`、`null` 和 `undefined` |
| 数组 | `string[]` 或 `Array<string>` | 数组里的元素都是字符串 |
| 元组 | `[string, number]` | 按位置规定类型，比如 `["小明", 18]` |
| 对象 | `{ id: number; name: string }` | 对象需要有哪些属性，以及属性值的类型 |
| 函数 | `(id: number) => string` | 接收一个数字，返回一个字符串 |
| 字面量类型 | `"loading"` | 只允许这个具体值 |
| 联合类型 | `string \| number` | 可以是字符串，也可以是数字 |
| 交叉类型 | `User & { role: string }` | 同时满足 `User` 和 `role` 属性的要求 |

对象类型可以用 `type` 或 `interface` 命名。例如把 `{ id: number; name: string }` 命名为 `User`，多个函数就能复用同一份定义。`type` 也可以给联合类型起名字，比如 `type Status = "loading" | "success" | "error"`。

## 用联合类型描述接口结果

假设查询用户的接口有两种结果。成功时返回用户，失败时返回错误信息。

```ts
type User = {
  id: number;
  name: string;
  email?: string;
};

type UserResult =
  | { ok: true; user: User }
  | { ok: false; message: string };

function getDisplayText(result: UserResult): string {
  if (result.ok) {
    return result.user.name;
  }

  return result.message;
}
```

`email?` 表示邮箱字段可以省略。`ok` 则让 TypeScript 区分两种结果。进入 `if` 后，TypeScript 知道 `ok` 是 `true`，因此允许访问 `result.user`。走到另一条分支时，才允许访问 `result.message`。这个根据判断缩小类型范围的过程叫**类型收窄**。

## `any`、`unknown`、`void` 和 `never` 分别用在哪？

| 类型 | 常见用法 |
| --- | --- |
| `any` | 暂时放宽类型检查，比如逐步给旧 JavaScript 代码补类型 |
| `unknown` | 接收类型未知的数据，先用 `typeof` 等方式检查，再访问或运算 |
| `void` | 描述只执行动作的函数，比如打印日志 |
| `never` | 描述永远不会产生返回值的函数，比如每次调用都会抛错的函数 |

`unknown` 和 `any` 的区别会直接影响你能写什么。如果 `value` 是 `unknown`，调用 `value.toUpperCase()` 前，需要先判断 `typeof value === "string"`。如果它是 `any`，TypeScript 会允许你直接调用。

## 用泛型描述异步结果

前面讲过的 Promise 也可以带上类型。`Promise<User>` 表示这个 Promise 成功后的值是 `User`。尖括号里的 `User` 就是**泛型参数**。

```ts
async function showUser(id: number) {
  const user = await getUser(id); // 假设 getUser 返回 Promise<User>
  console.log(user.name);
}
```

TypeScript 能从 `getUser` 的返回类型推断出 `user` 是 `User`。如果把 `user.name` 写成 `user.naem`，编辑器就能提前指出这个属性不存在。
