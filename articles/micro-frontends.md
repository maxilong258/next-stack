---
title: "微前端是什么？从独立发布到共享登录状态"
description: "以电商后台为例，说明微前端适用的场景、独立发布的代价，以及 qiankun、single-spa 和 Module Federation 如何共享登录状态。"
category: "technology"
date: "2026-11-10"
---

# 微前端是什么？从独立发布到共享登录状态

一个电商后台有商品、订单和售后三个模块，由三个团队分别维护。商品功能已经测试完了，却经常要等订单团队一起发版。几次下来，拖慢上线的是整套后台的统一发布流程。

**微前端可以把这个后台按业务拆成几个能独立发布的子应用，再组合成一个产品。** 用户仍然从同一个后台入口进入，看到统一的导航和登录体验。团队各自负责业务模块，比如商品团队负责 `/products`，订单团队负责 `/orders`。只要双方约定的接口保持兼容，订单团队就能单独发布自己的改动。 [Cam Jackson · Micro Frontends](https://martinfowler.com/articles/micro-frontends.html)

## 什么情况下值得拆？

- **多个团队长期负责不同业务，统一发版成了瓶颈。** 比如商品功能已经准备好，却经常要等其他模块测试完才能上线。
- **业务边界清晰。** 商品和订单各自有完整的页面和流程，主要共享登录、导航和少量公共能力。
- **旧系统需要分批迁移。** 比如先用新应用接管 `/orders`，其他模块继续运行，后续再逐步替换。

如果整个产品由一个小团队维护，主要问题是目录杂乱或业务逻辑耦合，可以先在一个应用里按业务拆模块。比如修改结算功能每次都要同时改购物车和订单，拆成两个应用之后，这条业务流程仍然要一起协调。 [Cam Jackson · 团队自治与渐进迁移](https://martinfowler.com/articles/micro-frontends.html)

## 常见方案怎么共享数据？

拿登录来说，可以由入口应用调用 `/api/me`，把返回的当前用户放进一个 `auth` 服务。**商品和订单应用使用同一个 `auth` 实例**，这样订单应用稍后挂载时能读到当前用户，用户退出登录时，已经挂载的应用也能收到通知。

不同方案的区别在于，子应用怎么拿到这个实例。

| 方案 | 子应用怎么拿到共享服务 |
| --- | --- |
| **qiankun** | 主应用注册子应用时传入 `props: { auth }`，子应用在 `mount(props)` 里取出。也可以用 `initGlobalState` 初始化公共状态，通过 `setGlobalState` 更新、通过 `onGlobalStateChange` 订阅。 [qiankun · API](https://qiankun.umijs.org/api/) |
| **single-spa** | 可以通过 `customProps` 传入 `auth`，也可以把它做成公共运行时模块，例如 `@company/auth`，让子应用各自导入。 [single-spa · customProps](https://single-spa.js.org/docs/configuration/#configcustomprops) · [应用间通信](https://single-spa.js.org/docs/recommended-setup/#inter-app-communication) |
| **Module Federation** | 由一个应用暴露 `./authStore`，其他应用在运行时导入这个模块，使用它提供的 Store 实例。共享 React 依赖和共享登录 Store 是两项独立的配置。 [Webpack · Module Federation](https://webpack.js.org/concepts/module-federation/) |

## 子应用可以约定一个 `useAuth()` 吗？

可以。先约定公共服务提供 `getSnapshot()` 和 `subscribe()`。前者返回当前用户，后者在用户变化时通知订阅者。浏览器里的 React 子应用可以把这两个方法封装成 Hook。

```jsx
import { useSyncExternalStore } from 'react'

function useAuth(auth) {
  return useSyncExternalStore(auth.subscribe, auth.getSnapshot)
}
```

这里的 `useAuth()` 负责让 React 在登录状态变化时更新界面。Vue 子应用也可以用自己的 composable 订阅同一个服务。两个项目如果只是各自写了一个同名的 Hook，里面各自用 `useState` 保存用户，就会得到两份独立的状态。如果模块切换会加载一份新的网页，新页面可以再请求 `/api/me` 恢复当前用户。 [React · useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)

共享范围可以从具体需求出发。当前用户、租户和主题适合由入口统一管理。订单页跳到售后页时，只需通过 URL 传递 `orderId`，售后自己查详情。如果两个模块都显示同一笔订单，可以在更新成功后发出 `order:updated` 事件，让相关模块刷新自己的数据。 [single-spa · 应用间通信](https://single-spa.js.org/docs/recommended-setup/#inter-app-communication)

## 独立发布要付出哪些代价？

| 代价 | 开发中会遇到什么 |
| --- | --- |
| **接口要保持兼容** | 如果入口把 `auth.getSnapshot()` 改名，已经上线的旧子应用可能立刻出错。共享服务也需要管理版本。 |
| **依赖和加载更难管理** | 同一页运行多个子应用时，可能重复下载框架和组件库。共享依赖可以减少体积，但升级时要协调版本。 |
| **发布和排障环节更多** | 一个页面打不开，要区分是入口路由、子应用资源加载失败，还是新旧版本之间的接口不兼容。 |
| **体验一致性需要维护** | 各团队可以独立发布，按钮、表单、错误提示和跨模块流程仍然需要共同的设计规范和端到端测试。 |

如果准备拆电商后台，可以先挑一个业务边界清晰、经常需要单独发版的模块，比如订单管理。让它先有独立的发布流程，再实际走一遍登录、跨模块跳转和回滚。这样就能看到，独立部署省下的协调时间，是否值得承担这些集成成本。 [Cam Jackson · 微前端的代价](https://martinfowler.com/articles/micro-frontends.html)
