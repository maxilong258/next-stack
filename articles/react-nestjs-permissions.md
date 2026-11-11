---
title: "React + NestJS 权限系统怎么设计？从一个退款按钮说起"
description: "以订单退款为例，用简短的 React 路由和按钮代码说明前端权限展示，再用 NestJS Guard 和订单归属检查说明服务端授权。"
category: "technology"
date: "2026-11-10"
---

# React + NestJS 权限系统怎么设计？从一个退款按钮说起

一个订单后台里，客服可以查订单，店长还可以退款。不过，店长只能退自己门店的订单。

这套权限由前后端一起处理。**React 根据权限显示菜单、页面和按钮。NestJS 在收到请求时，检查用户能不能执行这个操作，以及能不能操作这笔订单。** [OWASP · 授权指南](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## 前端用权限码控制菜单、路由和按钮

后端通过角色分配权限。比如客服有 `order:read`，店长还有 `order:refund`。登录后，React 通过 `GET /auth/me` 拿到当前用户的权限列表。

下面假设应用已经挂载了 `BrowserRouter`，权限已经加载，`useAuth()` 提供了一个 `can(code)` 函数。它的核心就是 `permissions.includes(code)`。

```jsx
import { Link, Route, Routes } from 'react-router'

function AppRoutes() {
  const { can } = useAuth()
  const canReadOrders = can('order:read')

  return (
    <>
      {canReadOrders && <Link to="/orders">订单管理</Link>}

      <Routes>
        <Route
          path="/orders"
          element={canReadOrders ? <OrdersPage /> : <ForbiddenPage />}
        />
      </Routes>
    </>
  )
}
```

同一个 `canReadOrders` 用了两次。菜单用它决定要不要显示「订单管理」，路由用它决定打开 `/orders` 时显示订单页还是无权访问页。这样，用户即使手动输入地址，也会走页面权限判断。 [React Router · 路由配置](https://reactrouter.com/start/declarative/routing)

退款按钮也用同一个 `can()`。

```jsx
function RefundButton({ order, onRefund }) {
  const { can } = useAuth()

  if (!can('order:refund')) return null
  if (!order.allowedActions.includes('refund')) return null

  return <button type="button" onClick={() => onRefund(order.id)}>退款</button>
}
```

第一条判断是**用户能不能退款**。第二条读取后端返回的 `allowedActions`，判断**这笔订单当前能不能退**。所以客服看不到按钮，店长打开一笔已退款的订单也看不到按钮。

## 后端用 Guard 检查接口权限

在 NestJS 里，可以用自定义装饰器给接口标记需要的权限，再用 Guard 统一检查。下面是退款接口的核心代码。

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post(':orderId/refund')
@RequirePermissions('order:refund')
refund(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
  return this.ordersService.refund(user, orderId);
}
```

请求到达后，`JwtAuthGuard` 验证 JWT，把用户身份放进 `request.user`。接着，`PermissionsGuard` 通过 `Reflector` 读到接口要求的 `order:refund`，再调用公共的 `AuthorizationService` 判断当前用户是否拥有这个权限。`GET /auth/me` 也可以用同一个服务生成权限列表，让界面和接口遵循同一套规则。 [NestJS · JWT 认证](https://docs.nestjs.com/recipes/passport) · [NestJS · 授权](https://docs.nestjs.com/security/authorization)

通过 Guard 后，订单服务再检查**订单归属和当前状态**。比如 A 门店店长有退款权限，但把请求里的 `orderId` 改成 B 门店的订单，后端仍然要拒绝。验收时，可以用有退款权限的账号直接请求退款接口，分别试本店和其他门店的订单。 [OWASP · 对象级授权](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/)
