---
title: "JavaScript Promise 从日常用法到简易实现"
description: "从回调、Promise 链到 async/await，理解异步结果如何传递，并用 MiniPromise 演示微任务调度。"
category: "technology"
date: "2026-11-09"
---

# JavaScript Promise 从日常用法到简易实现

发出一个网络请求后，响应还没回来，但代码已经拿到了一个 Promise。这个对象代表请求的结果。你可以用 `.then()` 处理成功后的数据，用 `.catch()` 处理失败，也可以把多个 Promise 组合起来，决定什么时候继续执行。

## Promise 解决了什么问题？

在原生 Promise 普及之前，异步接口常接收一个回调，等操作完成后再把结果交给它。比如先查用户，再用用户 ID 查订单，用 Node.js 常见的「错误放在第一个参数」的回调写法，可以这样写。

```js
getUser(id, (error, user) => {
  if (error) return showError(error);

  getOrders(user.id, (error, orders) => {
    if (error) return showError(error);

    render(orders);
  });
});
```

订单查询要等用户查询完成，所以写在第一个回调里。多加一步，就可能再嵌套一层，还要在每一步检查错误。**Promise 把异步结果表示成一个可以传递和组合的对象。** 当这两个接口都返回 Promise 时，就能把依赖关系写成一条链，把错误交给同一个处理函数。

```js
getUser(id)
  .then(user => getOrders(user.id))
  .then(orders => render(orders))
  .catch(error => showError(error));
```

## Promise 的状态和链式调用

一个 Promise 起初可以处于 `pending`（等待中），之后变成 `fulfilled`（成功）或 `rejected`（失败）。一旦成功或失败，状态就固定了。

```js
fetch("/api/user")
  .then(response => {
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }

    return response.json();
  })
  .then(user => {
    console.log(user.name);
  })
  .catch(error => {
    console.error(error.message);
  });
```

**每次 `.then()` 都会返回一个新的 Promise。** 回调返回普通值，下一个 `.then()` 就会收到这个值。回调返回另一个 Promise，下一步就等它的结果。这里的 `response.json()` 返回一个 Promise，所以第二个 `.then()` 等到 JSON 解析完成才拿到 `user`。

如果回调抛出错误，或者它返回的 Promise 失败，错误会沿链传到后面的 `.catch()`。需要在成功和失败后都做收尾时，可以用 `.finally()`，比如关闭加载提示。

## 为什么 `.then()` 的回调是微任务？

**回调是普通函数，Promise 负责安排它什么时候执行。** 调用 `.then()` 时，如果 Promise 还在等待，就先登记回调，等结果出来后再安排。如果 Promise 已经有了结果，就可以立即把对应回调的执行安排到微任务队列里。

```js
function show() {
  console.log("执行回调");
}

Promise.resolve().then(show);
show();
console.log("同步代码结束");
```

输出顺序是 **执行回调 → 同步代码结束 → 执行回调**。第一次 `show()` 是直接调用，第二次来自 Promise 安排的微任务。同一个函数，两次执行的时机不同。

## `async/await` 如何基于 Promise 工作？

同样是先查用户再查订单，`async/await` 可以让我们把依赖的步骤按执行顺序写下来，用 `try/catch` 处理两次查询的失败。

```js
async function showOrders(id) {
  try {
    const user = await getUser(id);
    const orders = await getOrders(user.id);
    render(orders);
  } catch (error) {
    showError(error);
  }
}
```

执行到 `await getUser(id)` 时，引擎先调用 `getUser(id)`，再暂停当前 `async` 函数，保留它的局部变量和执行位置。调用方此时已经可以拿到 `showOrders()` 返回的 Promise，其他代码也可以继续执行。

查询有了结果后，引擎通过微任务恢复这个函数。查询成功，`await` 表达式得到用户对象，赋值给 `user`。查询失败，`await` 会抛出失败原因，由 `catch` 处理。`.then()` 和 `await` 都依赖 Promise 的结果来安排后续工作。使用 `await` 时，暂停和恢复由语言负责。

## 如何等待多个 Promise？

| 方法 | 什么时候得到结果 | 常见用法 |
| --- | --- | --- |
| `Promise.all()` | 全部成功才成功，结果按传入顺序排列。任意一个失败，整体就失败 | 页面同时需要用户资料和权限 |
| `Promise.allSettled()` | 等所有任务结束，按传入顺序记录每项的成功值或失败原因 | 批量上传后显示哪些文件需要重试 |
| `Promise.race()` | 采用最先结束的结果，成功或失败都算 | 让请求和超时计时器竞争 |
| `Promise.any()` | 采用第一个成功的值。全部失败才以 `AggregateError` 拒绝 | 从多个备用服务中取第一个成功响应 |

下面两个组合在同一段代码里开始等待。`race` 先拿到 `"快"`，而 `all` 等两项都成功后，仍然把先传入的 `"慢"` 放在第一位。

```js
const slow = new Promise(resolve => {
  setTimeout(() => resolve("慢"), 100);
});
const fast = Promise.resolve("快");

Promise.all([slow, fast]).then(console.log);  // ["慢", "快"]
Promise.race([slow, fast]).then(console.log); // "快"，先输出
```

如果几个请求互不依赖，可以先发起它们，再用 `await Promise.all()` 一起等结果。比如加载用户资料和权限时，两次查询都可以立即开始。

```js
const [profile, permissions] = await Promise.all([
  getProfile(id),
  getPermissions(id),
]);
```

## 手写一个简易 Promise

教学版保存**状态、结果、等待执行的回调**。构造函数立即调用执行器，`.then()` 则创建一个新的 `MiniPromise`，并用 `queueMicrotask()` 安排回调。四个组合方法都基于 `.then()`，可以接收 `MiniPromise` 实例和普通值。

```js
class MiniPromise {
  #state = "pending";
  #value;
  #handlers = [];

  constructor(executor) {
    let locked = false;

    const once = fn => value => {
      if (locked) return;
      locked = true;
      fn(value);
    };

    const resolve = once(value => this.#resolve(value));
    const reject = once(error => this.#settle("rejected", error));

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  #resolve(value) {
    if (value === this) {
      this.#settle("rejected", new TypeError("Promise 不能等待自己"));
    } else if (value instanceof MiniPromise) {
      value.then(
        result => this.#resolve(result),
        error => this.#settle("rejected", error)
      );
    } else {
      this.#settle("fulfilled", value);
    }
  }

  #settle(state, value) {
    this.#state = state;
    this.#value = value;

    for (const run of this.#handlers) queueMicrotask(run);
    this.#handlers = [];
  }

  then(onFulfilled, onRejected) {
    return new MiniPromise((resolve, reject) => {
      const run = () => {
        const fulfilled = this.#state === "fulfilled";
        const handler = fulfilled ? onFulfilled : onRejected;

        if (typeof handler !== "function") {
          (fulfilled ? resolve : reject)(this.#value);
          return;
        }

        try {
          resolve(handler(this.#value));
        } catch (error) {
          reject(error);
        }
      };

      if (this.#state === "pending") this.#handlers.push(run);
      else queueMicrotask(run);
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  static resolve(value) {
    if (value instanceof MiniPromise) return value;
    return new MiniPromise(resolve => resolve(value));
  }

  static all(iterable) {
    return new MiniPromise((resolve, reject) => {
      const inputs = [...iterable];
      const results = new Array(inputs.length);
      let remaining = inputs.length;

      if (remaining === 0) resolve(results);

      inputs.forEach((input, index) => {
        MiniPromise.resolve(input).then(value => {
          results[index] = value;
          remaining -= 1;
          if (remaining === 0) resolve(results);
        }, reject);
      });
    });
  }

  static race(iterable) {
    return new MiniPromise((resolve, reject) => {
      for (const input of iterable) {
        MiniPromise.resolve(input).then(resolve, reject);
      }
    });
  }

  static allSettled(iterable) {
    return new MiniPromise(resolve => {
      const outcomes = [...iterable].map(input =>
        MiniPromise.resolve(input).then(
          value => ({ status: "fulfilled", value }),
          reason => ({ status: "rejected", reason })
        )
      );

      resolve(MiniPromise.all(outcomes));
    });
  }

  static any(iterable) {
    return new MiniPromise((resolve, reject) => {
      const inputs = [...iterable];
      const errors = new Array(inputs.length);
      let remaining = inputs.length;
      const rejectAll = () => reject(new AggregateError(errors, "没有任务成功"));

      if (remaining === 0) rejectAll();

      inputs.forEach((input, index) => {
        MiniPromise.resolve(input).then(resolve, reason => {
          errors[index] = reason;
          remaining -= 1;
          if (remaining === 0) rejectAll();
        });
      });
    });
  }
}
```

`once` 让执行器里的 `resolve` 和 `reject` 只接受第一次调用。即使第一次 `resolve` 收到的是一个还在等待的 `MiniPromise`，也会跟随它的结果，后续再调用 `reject` 不会改变这个决定。

把下面的代码接在类定义后面运行，会先输出「同步代码结束」，等定时器到期后再输出 `6`。

```js
new MiniPromise(resolve => resolve(2))
  .then(n => new MiniPromise(resolve => {
    setTimeout(() => resolve(n * 3), 100);
  }))
  .then(console.log)
  .catch(console.error);

console.log("同步代码结束");
```

组合方法里的 `MiniPromise.resolve()` 会把普通值转成已成功的 `MiniPromise`。`all` 按输入下标填写结果数组，所以任务完成的先后不会打乱结果。`race` 把每一项的成功和失败都交给同一对 `resolve`、`reject`，最先调用的那个决定结果。

```js
const slowTask = new MiniPromise(resolve => {
  setTimeout(() => resolve("慢"), 100);
});

MiniPromise.all([slowTask, "快"]).then(console.log);  // ["慢", "快"]
MiniPromise.race([slowTask, "快"]).then(console.log); // "快"，先输出
```

`allSettled` 把成功和失败都转成一条结果记录，再交给 `all` 收集。`any` 在第一次成功时就兑现，只有收齐所有失败原因时才用 `AggregateError` 拒绝。

空输入也遵循同样的规则。`all([])` 和 `allSettled([])` 得到空数组，`any([])` 以 `AggregateError` 拒绝，`race([])` 则一直保持等待。
