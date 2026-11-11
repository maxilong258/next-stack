---
title: "什么是依赖注入？从办公室打印报表说起"
description: "用办公室打印机和 JavaScript 构造函数解释依赖注入、控制反转，以及 NestJS 如何把依赖传给服务。"
category: "technology"
date: "2026-11-11"
---

# 什么是依赖注入？从办公室打印报表说起

你在办公室负责打印报表。行政给你分配了一台打印机，你把报表交给它打印。后来那台机器坏了，行政给你换了一台，你还是照原来的方式打印报表。

放到程序里，**报表服务需要打印机才能完成工作，所以打印机是它的依赖。创建报表服务时，把选好的打印机传给它，这就叫依赖注入。**

```js
class ReportService {
  constructor(printer) {
    this.printer = printer
  }

  printReport(report) {
    this.printer.print(report)
  }
}

const frontDeskPrinter = {
  print(report) {
    console.log('前台打印机收到报表', report)
  },
}

const reportService = new ReportService(frontDeskPrinter)
reportService.printReport('本月销售报表')
```

看 `new ReportService(frontDeskPrinter)` 这一行。创建服务的人选好了打印机，`ReportService` 收到以后，只管调用它的 `print()`。如果财务部需要用自己的设备，创建服务时传入财务部的打印机就行。两边可以共用同一份报表处理代码。

## 控制反转发生在哪里？

如果报表服务自己创建打印机，它就决定了用哪台设备。把这个决定交给创建服务的人，**选择依赖的控制权就从服务内部移到了外部**，这就是这个例子里的**控制反转（IoC）**。选好以后，通过构造函数把设备传进去，是实现它的方式，这一步叫**依赖注入（DI）**。

## NestJS 在这里做了什么？

上面是手动创建 `ReportService` 并传入打印机。用 NestJS 时，你在构造函数里声明需要打印机，在模块里登记由哪个对象提供打印功能。NestJS 创建 `ReportService` 时，会找到登记的对象，把它传进构造函数。等到业务代码调用 `printReport()`，打印机已经在 `this.printer` 上了。 [NestJS 依赖注入文档](https://docs.nestjs.com/fundamentals/custom-providers#di-fundamentals)
