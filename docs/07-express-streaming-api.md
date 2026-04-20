# 第 7 章：Express API 与流式接口

## 这一章学什么

- Express 如何直接承接 AI SDK 的流式结果
- lesson 路由与 agent 路由如何分层
- 为什么课程里把 API 设计得非常薄

## 对应官方文档

- [Examples: API Servers / Express](https://ai-sdk.dev/examples/api-servers/express)
- [Reference: `pipeUIMessageStreamToResponse`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/pipe-ui-message-stream-to-response)
- [Reference: `convertToModelMessages`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages)

## 功能目标

让 Next 前端把消息发给 Express，再把 UI message stream 原样接回来。

## 关键代码

```ts
const result = await streamAgentMessages({
  agentId,
  messages,
  provider: parsed.provider,
});

result.pipeUIMessageStreamToResponse(res);
```

## 为什么这样设计

- 后端只负责模型、工具、协议转换
- 前端专注展示和交互，不关心底层模型细节

## 练习题

- 给 agent route 加 sessionId
- 新增一个 `/api/agents/:agentId/preview` JSON 接口

## 常见坑

- 把 UIMessage 直接当成模型 messages 使用
- 没有在服务端先做消息校验
