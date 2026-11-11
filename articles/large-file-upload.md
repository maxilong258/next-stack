---
title: "大文件上传怎么设计？从分片到断点续传"
description: "以 React、NestJS 和 S3 上传视频为例，说明分片直传、并发控制、失败重试、断点续传和进度统计。"
category: "technology"
date: "2026-11-10"
---

# 大文件上传怎么设计？从分片到断点续传

上传一个 `1 GiB` 的视频，如果传到一半断网，重新发送整个文件会很浪费。可以把视频分成多个小片，分别上传和记录结果。某一片失败就只重传那一片，全部传完后再由对象存储合成完整文件。 [AWS · 分片上传](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)

以 React、NestJS 和 S3 为例，**React 负责切片和显示进度，NestJS 负责权限和上传任务，S3 直接接收文件数据**。后端记录任务并签发上传地址，浏览器把分片直接传到存储。

## 从选择文件到合成文件

假设视频大小是 `1 GiB`，每片 `16 MiB`，一共 `64` 片。浏览器可以用 `file.slice()` 取出指定分片。分片编号从 `1` 开始，最后一片按文件实际大小截取。

```js
const partSize = 16 * 1024 * 1024
const partCount = Math.ceil(file.size / partSize)

function getPart(partNumber) {
  const start = (partNumber - 1) * partSize
  const end = Math.min(start + partSize, file.size)
  return file.slice(start, end)
}
```

上传时可以限制并发，比如同时传 `3` 片。每完成一片，再从队列里补一片。

| 步骤 | 前后端怎么配合 |
| --- | --- |
| **创建任务** | React 提交文件名和大小。NestJS 校验用户和文件限制，确定对象路径，并记录 S3 返回的 `uploadId`。 |
| **上传分片** | React 向 NestJS 申请某片的预签名 URL，再用 `PUT` 把对应的文件片段直接传给 S3。上传成功后，S3 返回该片的 `ETag`。 |
| **记录分片** | React 把成功分片的 `partNumber` 和 `ETag` 报给 NestJS。后端保存这份记录，供断点续传和最后合并使用。 |
| **完成上传** | NestJS 检查任务归属和分片记录是否齐全，再把分片编号和对应的 `ETag` 交给 S3。S3 按编号顺序拼成完整文件。后端确认成功后，再把任务标记为完成。 |

预签名 URL 只在限定时间内允许上传指定分片，AWS 凭证由后端保管。如果浏览器跨域直传，Bucket 的 CORS 要允许站点发出的 `PUT`，还要通过 `ExposeHeaders` 暴露 `ETag`，这样前端才能从响应头里读到它。 [AWS · 预签名 URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) · [AWS · CORS 配置](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html)

## 失败后怎么重试和续传？

- **某一片上传失败。** 沿用同一个 `uploadId` 和 `partNumber` 重传。S3 会覆盖同编号的旧分片。如果只是预签名 URL 过期，向后端重新申请这一片的地址。 [AWS · UploadPart](https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html)
- **断网或刷新后恢复。** 前端用任务 ID 查询已确认的分片。比如已有 `40` 片完成，重新选中同一个视频后，只传剩余的 `24` 片。刷新后通常需要重新选择本地文件，所以任务和成功分片记录要能从后端恢复。
- **暂停或彻底取消。** 两种情况都先停止调度新分片，再取消浏览器里正在进行的上传。暂停时保留任务。彻底取消时，由 NestJS 通知 S3 放弃该任务。还可以配置生命周期规则，清理长期未完成的上传。 [AWS · 清理未完成的分片上传](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html)

如果一片已经传到 S3，但前端还没来得及回报结果就断网，恢复后可以重传这一片。合并时使用后端保存的分片编号和对应的 `ETag`，`ListParts` 可以用来核对存储端的记录。 [AWS · 分片记录与合并](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)

## 进度条怎么计算？

进度条可以用**已确认成功的分片字节数，加上当前各分片已传的字节数，再除以文件总大小**。浏览器可以用 `XMLHttpRequest.upload` 获取上传进度。某一片失败重试时，把它的临时进度归零。某一片成功后，把它从临时进度移到已完成字节数里，避免重复计数。 [MDN · 上传进度](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload)

最后一片传完时，可以先显示「正在合并」。等后端确认 S3 已经生成完整文件，再显示「上传成功」。
