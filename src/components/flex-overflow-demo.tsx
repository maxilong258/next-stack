const articleTitle = "从输入 URL 到页面显示，浏览器如何处理网络请求、解析文档并把内容绘制到屏幕上？"

export function FlexOverflowDemo() {
  return (
    <section
      id="flex-overflow-demo"
      aria-labelledby="flex-overflow-demo-heading"
      className="mb-20 min-w-0 scroll-mt-24 space-y-4"
    >
      <h2 id="flex-overflow-demo-heading" className="text-2xl font-bold tracking-tight">
        实际效果
      </h2>
      <p className="text-muted-foreground">
        虚线标出 Flex 容器的边界。观察右侧标题是越过边界，还是在边界内显示省略号。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "修复前", minWidth: "auto" },
          { label: "修复后", minWidth: "0" },
        ].map(({ label, minWidth }) => (
          <figure key={label} className="min-w-0 space-y-3 rounded-lg border bg-card p-4">
            <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold">{label}</span>
              <code className="text-sm text-muted-foreground">min-width: {minWidth}</code>
            </figcaption>
            <div className="relative overflow-hidden rounded-sm bg-muted/50">
              <div className="flex w-4/5 text-sm leading-6">
                <span className="shrink-0 bg-secondary px-2 py-1">文章</span>
                <div className="flex-1" style={{ minWidth }}>
                  <p className="truncate px-2 py-1" title={articleTitle}>{articleTitle}</p>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-4/5 rounded-sm border border-dashed border-muted-foreground"
              />
            </div>
          </figure>
        ))}
      </div>
    </section>
  )
}
