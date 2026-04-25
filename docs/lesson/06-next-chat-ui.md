# 第 6 章：Next 前端聊天层

## 这一章学什么

- `useChat` 在 AI SDK 5 里的 transport 架构
- 为什么消息渲染应该围绕 `parts`
- 工具结果完成后如何自动继续

## 对应官方文档

- [Reference: `useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [Reference: `DefaultChatTransport`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/default-chat-transport)
- [Reference: `lastAssistantMessageIsCompleteWithToolCalls`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/last-assistant-message-is-complete-with-tool-calls)

## 功能目标

做一个可切换 Agent 模式的聊天页面。

## 关键代码

```ts
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: `${serverUrl}/api/agents/${agentId}/chat`,
    body: () => ({ provider }),
  }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
});
```

## 为什么这样设计

- transport 让前端和 Express 后端保持松耦合
- 自动继续可以降低多步 tool flow 的心智负担

## 练习题

- 给不同 Agent 模式设置不同欢迎词
- 渲染 tool part 的输入和输出摘要

## 常见坑

- 还在沿用老版本 `useChat` 的 input 状态写法
- 渲染 assistant 消息时忽略了 `parts`
