---
title: "NestJS 装饰器"
description: "装饰器是一种特殊函数。NestJS 用它声明元数据，再由框架读取并完成路由注册、参数提取和请求处理。"
category: "technology"
date: "2026-10-13"
---

# NestJS 装饰器

## 一、装饰器是什么？

装饰器（Decorator）本质上是一种特殊的函数，可以作用于类、方法、属性或参数，用于添加元数据或修改原有行为。

装饰器不是 NestJS 发明的，而是 TypeScript 支持的一种语法机制。

例如：

```ts
@Controller('users')
export class UserController {
  @Get(':id')
  getUser(@Param('id') id: string) {
    return { id };
  }
}
```

这里的装饰器分别表示：

- `@Controller('users')`：声明 Controller 和路由前缀。
- `@Get(':id')`：声明方法对应的 HTTP 路由。
- `@Param('id')`：声明参数从 URL 中提取。

这些装饰器主要负责声明信息，实际的路由注册、参数提取和请求处理由 NestJS 框架完成。

## 二、为什么使用装饰器？有什么优点？

装饰器主要有四个优点：

| 优点 | 说明 |
| --- | --- |
| 声明式编程 | 直接在类或方法上描述功能，不需要单独配置 |
| 减少重复代码 | 将日志、权限、校验等通用逻辑抽离 |
| 关注点分离 | 业务方法只处理业务，其他功能交给装饰器或框架 |
| 易于扩展 | 可以自定义装饰器，为类和方法添加额外能力 |

例如，不使用装饰器时：

```ts
router.get('/users', controller.getUsers);
router.post('/users', controller.createUser);
```

NestJS 使用装饰器：

```ts
@Controller('users')
class UserController {
  @Get()
  getUsers() {}

  @Post()
  createUser() {}
}
```

这样路由信息直接写在对应的方法旁边，代码更集中，也方便 NestJS 统一管理。

## 三、装饰器是怎么实现的？

装饰器本质上是函数。它在被装饰的类定义时执行，而不是每次调用业务方法时都执行。

### 1. 最简单的类装饰器

```ts
function MyDecorator(target: Function) {
  console.log(target.name);
}

@MyDecorator
class UserService {}
```

可以近似理解为：

```ts
class UserService {}

MyDecorator(UserService);
```

其中 `target` 就是被装饰的类。

### 2. 为什么装饰器可以传参数？

例如：

```ts
@Controller('users')
```

这是因为 `Controller()` 是一个返回装饰器的函数，也叫装饰器工厂。

```ts
function Controller(path: string) {
  return function (target: Function) {
    console.log(path, target.name);
  };
}

@Controller('users')
class UserController {}
```

相当于：

```ts
const decorator = Controller('users');

decorator(UserController);
```

外层函数接收配置参数，内层函数才是真正的装饰器。

## 四、NestJS 装饰器的核心实现原理

NestJS 最常见的实现方式是：装饰器添加元数据，框架读取元数据，然后执行相应逻辑。

例如模拟 `@Controller()`：

```ts
import 'reflect-metadata';

function Controller(path: string) {
  return function (target: Function) {
    Reflect.defineMetadata('path', path, target);
  };
}

@Controller('users')
class UserController {}
```

这里：

```ts
Reflect.defineMetadata('path', 'users', UserController);
```

相当于给类关联了一条元数据：

```text
UserController
  └── Metadata
       └── path = "users"
```

元数据通常保存在运行时内存中，由 `reflect-metadata` 提供读写能力。

读取元数据：

```ts
const path = Reflect.getMetadata(
  'path',
  UserController,
);

console.log(path); // users
```

NestJS 会在初始化过程中扫描 Controller、读取元数据，并建立路由映射。

1. 声明装饰器：`@Get('users')`
2. 写入元数据：`Reflect.defineMetadata()`
3. NestJS 初始化：扫描并读取元数据
4. 注册路由：建立 URL 与方法的映射
5. 请求到来：执行对应的 Controller 方法

注意，装饰器本身并不负责执行 HTTP 请求，也不负责实际的权限检查。它只是声明配置，真正执行的是 NestJS 框架。

## 五、装饰器有哪些常见用途？

装饰器主要分为两种使用方式。

### 1. 添加元数据（NestJS 最常见）

例如：

```ts
@UseGuards(AuthGuard)
@Get('users')
getUsers() {}
```

`@UseGuards()` 的核心工作是将 Guard 信息保存到元数据中。

NestJS 在构建请求处理流程时读取这些元数据，并在请求到来时调用 Guard 的 `canActivate()`。

其他常见例子：

| 装饰器 | 用途 |
| --- | --- |
| `@Controller()` | 声明 Controller |
| `@Get()`、`@Post()` | 声明路由 |
| `@Injectable()` | 标记类可由 NestJS 依赖注入系统管理 |
| `@UseGuards()` | 配置权限守卫 |
| `@UseInterceptors()` | 配置拦截器 |
| `@UsePipes()` | 配置参数转换和校验 |
| `@SetMetadata()` | 自定义元数据 |
| `@Param()`、`@Body()` | 声明请求参数的提取方式 |

其中 `@Param()`、`@Body()` 还涉及参数位置等元数据，并不是所有装饰器都简单地把信息存到类上。

### 2. 直接修改方法行为

装饰器也可以直接包装或替换原来的方法。

例如实现一个日志装饰器：

```ts
function Log(
  target: any,
  key: string,
  descriptor: PropertyDescriptor,
) {
  const original = descriptor.value;

  descriptor.value = function (...args: any[]) {
    console.log('执行前');

    const result = original.apply(this, args);

    console.log('执行后');

    return result;
  };

  return descriptor;
}
```

使用：

```ts
class UserService {
  @Log
  getUser() {
    console.log('获取用户');
  }
}

new UserService().getUser();
```

输出：

```text
执行前
获取用户
执行后
```

原理是通过 `descriptor.value` 替换原方法。

这里要区分两个执行时机：

- `@Log` 装饰器在类定义时执行，完成方法包装。
- 包装后的方法在每次调用 `getUser()` 时执行。

这种方式不依赖 NestJS，普通 TypeScript 类也可以使用。

常见用途包括日志记录、性能统计、缓存、失败重试、防抖、参数校验等。

不过在 NestJS 中，对于 HTTP 请求的日志、缓存、权限等功能，通常更推荐使用 Interceptor、Guard、Pipe 等框架机制。

## 六、装饰器有哪几种？

在 NestJS 常用的 TypeScript legacy 装饰器体系中：

| 类型 | 作用对象 | 常见例子 |
| --- | --- | --- |
| 类装饰器 | Class | `@Controller()` |
| 方法装饰器 | Method | `@Get()` |
| 属性装饰器 | Property | `@Inject()` |
| 参数装饰器 | Parameter | `@Param()` |

TypeScript 还有新版标准装饰器机制，其函数签名与 legacy 装饰器不同。本文示例使用的是 NestJS 常见的 legacy 装饰器语法。

## 七、最终总结

NestJS 装饰器需要掌握的核心知识：

1. **本质**：装饰器是一种特殊的函数，可以扩展类、方法、属性或参数。
2. **作用**：主要用于添加元数据，也可以直接修改方法行为。
3. **实现**：通过装饰器函数接收目标对象，使用 `Reflect.defineMetadata()` 保存信息，或者通过 `descriptor.value` 修改方法。
4. **执行时机**：装饰器在类定义时应用，而不是每次请求时重新执行。
5. **NestJS 工作机制**：装饰器声明信息 → NestJS 读取元数据 → 框架在适当时机执行对应逻辑。
6. **优势**：声明式、减少重复代码、关注点分离、易于扩展。
7. **常见用途**：路由注册、依赖注入、权限守卫、拦截器、参数校验、自定义元数据，以及日志、缓存等方法包装。

一句话理解：装饰器就是在不直接修改业务代码的情况下，为类或方法附加信息或扩展行为的一种机制；NestJS 主要利用它来声明配置，再由框架统一解释和执行。
