---
title: "Tree Shaking 是什么？为什么只用两个图标，可能把整个图标库打进包里？"
description: "从工具函数和 Lucide 图标出发，解释 Tree Shaking 如何移除未使用的导出、何时会保留更多代码，以及如何用 Next.js 分析客户端包。"
category: "technology"
date: "2026-11-10"
---

# Tree Shaking 是什么？为什么只用两个图标，可能把整个图标库打进包里？

一个工具模块导出了十个函数，页面只用了其中一个。生产构建时，打包器可以分析哪些函数被用到，并从最终的 JavaScript 里移除能安全删除的部分。这就是 **Tree Shaking**。它发生在构建阶段，浏览器下载的是处理后的文件。 [Webpack · Tree Shaking](https://webpack.js.org/guides/tree-shaking/) · [Rollup · Tree-Shaking](https://rollupjs.org/introduction/#tree-shaking)

## 打包器怎么知道哪段代码用不到？

假设商品页只需要格式化价格，日期格式化函数暂时没有用到。

```js
// format.js
export function formatPrice(price) {
  return `¥${price.toFixed(2)}`
}

export function formatDate(date) {
  return date.toLocaleDateString('zh-CN')
}

// main.js
import { formatPrice } from './format.js'

document.querySelector('#price').textContent = formatPrice(29)
```

打包器从 `main.js` 这样的入口出发，顺着 `import` 和 `export` 分析引用关系。它能在构建时看出这里引用了 `formatPrice`。如果其他入口也用不到 `formatDate`，就可以把日期格式化的实现从产物里移除。我们平时很少关注这个过程，因为生产构建通常已经自动做了这一步。 [Webpack · 未使用的导出与生产构建](https://webpack.js.org/guides/tree-shaking/)

## 什么情况下，打包器会保留更多代码？

**运行时才知道要用哪个导出。** 这个博客的主题按钮直接写 `import { Moon, Sun } from 'lucide-react'`，打包器能看出它用到了哪两个图标。假设后台菜单的图标名由接口返回，代码改成了下面这样。

```jsx
import * as icons from 'lucide-react'

const Icon = icons[iconName]
```

`iconName` 在构建时未知。打包器为了保证运行时还能查到图标，可能会保留大量导出。如果菜单实际只支持几个图标，可以显式导入这些图标，再建立映射。

```jsx
import { Moon, Sun } from 'lucide-react'

const icons = { moon: Moon, sun: Sun }
const Icon = icons[iconName]
```

接口仍然可以传字符串，打包器能看到的候选范围则从整个库缩小到了这两个图标。 [Lucide · React 图标](https://lucide.dev/guide/react)

**模块一导入就会执行有用的操作。** 比如 `import './global.css'` 会应用样式，`import './register-shortcuts.js'` 可能会注册键盘快捷键。即使这些导入没有提供任何被引用的变量，删掉它们也会改变页面行为。写组件库时，如果误把 `package.json` 的 `sideEffects` 设成 `false`，就可能出现开发时有样式、生产构建后样式丢失的问题。 [Webpack · CSS 与 sideEffects](https://webpack.js.org/guides/tree-shaking/#full-example-understanding-side-effects-with-css-files)

**依赖的导出难以静态分析。** 有些库只提供 CommonJS，或者在运行时动态组装 `module.exports`。这时即使你只调用了一个函数，打包器也可能无法判断哪些代码可以删。最终能裁掉多少，取决于库的写法和打包器的分析能力。 [Webpack · Tree Shaking 指南](https://webpack.js.org/guides/tree-shaking/#conclusion)

## 平时什么时候需要检查？

比如你给首页加了两个图标，结果首屏 JS 突然大了一截。这时可以打开 Bundle Analyzer，看客户端包里多了什么，以及它是从哪一行导入进来的。这个博客使用 Next.js **16.1.6**，对应的命令如下。

```bash
pnpm exec next experimental-analyze
```

先找到变大的路由和模块，再沿着导入链看是动态引用、依赖本身较大，还是这段代码其实只在某个操作中才需要。 [Next.js · Bundle Analyzer](https://nextjs.org/docs/app/guides/package-bundling#nextjs-bundle-analyzer)

比如日期格式化函数在整个项目里都用不到，可以让 **Tree Shaking** 把它移除。Excel 导出库确实会用到，只是用户点「导出」之前不需要下载，可以用动态 `import()` 做**代码分割**，把下载推迟到点击时。前一种减少最终产物里的代码，后一种减少首屏需要下载的代码。 [Webpack · 动态导入与代码分割](https://webpack.js.org/guides/code-splitting/#dynamic-imports)
