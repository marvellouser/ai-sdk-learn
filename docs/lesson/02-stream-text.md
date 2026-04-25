# 第 2 章：流式输出

## 这一章学什么

- 为什么聊天产品几乎都优先做流式输出
- `streamText` 和普通 `generateText` 的区别
- Express 如何把流式结果返回给前端

## 对应官方文档

- [Reference: `streamText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Reference: `pipeTextStreamToResponse`](https://ai-sdk.dev/docs/reference/ai-sdk-core/pipe-text-stream-to-response)

## 功能目标

做一个“学习建议流”。
用户输入目标，前端逐字看到 5 条学习建议出现。

## 关键代码

```ts
const result = streamText({
  model,
  prompt: `请围绕这个目标给出 5 条学习建议...`,
});

result.pipeTextStreamToResponse(res);
```

## 为什么这样设计

- 流式输出让用户更早感受到“系统在工作”
- Express 场景下可以直接把文本流推给浏览器，不需要自己手写复杂 SSE

## 练习题

- 给流式建议前面加一个固定前缀
- 把 lesson-2 改造成支持 DeepSeek

## 常见坑

- 前端直接按 JSON 解析流式响应
- 代理层没有正确放行流式传输
