---
title: "React useMemo 和 useCallback 缓存了什么？"
description: "用购物车例子和 React 19.1.0 源码，解释 useMemo 如何缓存计算结果、useCallback 如何复用函数引用，以及 React.memo 如何跳过子组件渲染。"
category: "technology"
date: "2026-11-10"
---

# React `useMemo` 和 `useCallback` 缓存了什么？

一个商品列表页面上有个「加入购物车」按钮。点一下，购物车数量变了，商品列表却还是原来那几件商品。这时，React 会不会重新渲染列表？如果每次筛选出来的商品都一样，为什么还要用 `useMemo`？

这取决于两件事：**计算有没有重新执行，以及子组件收到的 props 是否相同。** `useMemo` 缓存计算结果，`useCallback` 缓存函数引用。它们都可以让传给子组件的 props 保持稳定，再由 `React.memo` 判断能不能跳过渲染。

## 计算结果一样，子组件也会重新渲染吗？

如果子组件用了 `React.memo`，而且所有 props 比较起来都相同，它就可以跳过这次渲染。比如父组件重新算了一次 `2 + 3`，传给子组件的还是数字 `5`。即使没有 `useMemo`，这个 prop 也算相同。

但 `filter()` 每次都会创建一个新数组。两次筛出同样的商品，得到的也是两个不同的数组。函数同理，每次执行箭头函数表达式，都会得到一个新函数。React 默认用 `Object.is` 逐个比较 `memo` 组件的 prop，因此会把这些新引用当作变化。 [React · memo](https://react.dev/reference/react/memo)

```js
Object.is(5, 5);                       // true
Object.is(['苹果'], ['苹果']);          // false
Object.is(() => '苹果', () => '苹果');   // false
```

## 用购物车例子把三个 API 串起来

```jsx
import { memo, useCallback, useMemo, useState } from 'react';

const ProductList = memo(function ProductList({ products, onAdd }) {
  return products.map(product => (
    <button key={product.id} onClick={() => onAdd(product.id)}>
      加入购物车：{product.name}
    </button>
  ));
});

function Shop({ products, keyword }) {
  const [cart, setCart] = useState([]);

  const visibleProducts = useMemo(() => {
    return products.filter(product => product.name.includes(keyword));
  }, [products, keyword]);

  const addToCart = useCallback(productId => {
    setCart(items => [...items, productId]);
  }, []);

  return (
    <>
      <p>购物车：{cart.length} 件</p>
      <ProductList products={visibleProducts} onAdd={addToCart} />
    </>
  );
}
```

点「加入购物车」时，`addToCart` 执行并调用 `setCart`，React 因此重新渲染 `Shop`。假设这一轮 `products` 的引用和 `keyword` 都没变：

1. **`useMemo` 返回上次筛选出的数组。** 这一轮可以跳过 `filter()`，列表收到的 `products` 也还是原来的引用。
2. **`useCallback` 返回上次的 `addToCart`。** 回调通过 `setCart(items => ...)` 拿到要更新的购物车状态，因此无需读取外层的 `cart`，依赖可以写成 `[]`。
3. **React 比较列表的两个 props。** `products` 和 `onAdd` 都相同，所以 `ProductList` 可以跳过这次渲染。父组件 `Shop` 照常渲染，购物车数量也会更新。 [React · useMemo](https://react.dev/reference/react/useMemo) · [React · 在缓存的回调中更新状态](https://react.dev/reference/react/useCallback#updating-state-from-a-memoized-callback)

如果只去掉 `useCallback`，点击仍然是通过 `setCart` 触发 `Shop` 更新。区别出现在 **`Shop` 重新执行之后**。这一轮创建了新的 `addToCart`，于是 `ProductList` 的 `onAdd` 变了，React 就会重新渲染列表。新函数是父组件渲染时产生的，影响的是子组件能不能跳过渲染。

## React 源码里，两者如何更新缓存？

React 19.1.0 把缓存值和依赖放在各自的 Hook 记录里。更新时，两者都通过 `areHookInputsEqual` 逐项比较依赖。下面省略了查找 Hook、处理参数和开发环境检查的代码。 [React 19.1.0 · ReactFiberHooks](https://github.com/react/react/blob/v19.1.0/packages/react-reconciler/src/ReactFiberHooks.js#L2914-L2977)

`useMemo` 在需要更新缓存时，会**调用计算函数**。

```js
const [prevValue, prevDeps] = hook.memoizedState;
if (deps !== null && areHookInputsEqual(deps, prevDeps)) {
  return prevValue;
}

const nextValue = create();
hook.memoizedState = [nextValue, deps];
return nextValue;
```

`useCallback` 在需要更新缓存时，会**直接保存本轮传入的函数**。

```js
const [prevCallback, prevDeps] = hook.memoizedState;
if (deps !== null && areHookInputsEqual(deps, prevDeps)) {
  return prevCallback;
}

hook.memoizedState = [callback, deps];
return callback;
```

所以 `useCallback` 里的箭头函数表达式每轮仍会求值。依赖没变时，React 会把上次保存的函数返回给你。函数体什么时候执行，取决于你什么时候调用它，比如用户什么时候点按钮。 [React · useCallback](https://react.dev/reference/react/useCallback)

`React.memo` 的判断则发生在 React 准备更新子组件时。默认比较函数 `shallowEqual` 检查新旧 props 的键，再用 `Object.is` 比较每个 prop。源码还会检查 `ref`，以及组件是否有本轮要处理的更新或 Context 变化。因此，列表自己的状态更新仍然可以触发渲染。 [React 19.1.0 · memo 更新路径](https://github.com/react/react/blob/v19.1.0/packages/react-reconciler/src/ReactFiberBeginWork.js#L530-L609)

## 日常开发什么时候用？

- **计算确实耗时**，比如对大量数据筛选、排序，可以用 `useMemo` 在输入没变时跳过计算。即使没有 `memo` 子组件，这也能省下计算本身的开销。
- **数组或函数要传给 `memo` 子组件**，可以分别用 `useMemo` 和 `useCallback` 保持引用稳定。普通子组件默认还是会跟着父组件渲染。
- **函数是另一个 Hook 的依赖**，可以用 `useCallback` 让引用随实际依赖变化。比如某个 Effect 依赖的函数读取了 `roomId`，就把 `roomId` 写进依赖数组，让切换房间时拿到引用新值的函数。 [React · useMemo 的使用场景](https://react.dev/reference/react/useMemo#skipping-expensive-recalculations) · [React · useCallback 的使用场景](https://react.dev/reference/react/useCallback#preventing-an-effect-from-firing-too-often)
