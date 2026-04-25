# 第 8 章：Provider 切换扩展

## 这一章学什么

- 为什么 provider factory 是关键抽象层
- Qwen 和 DeepSeek 在同一套业务代码里如何切换
- 如何通过 `key + baseUrl + modelName` 做统一接入

## 对应官方文档

- [OpenAI-compatible providers](https://ai-sdk.dev/providers/openai-compatible-providers)
- [Reference: `generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)

## 功能目标

让同一套 lesson 和 analyst Agent 在 `qwen` / `deepseek` 两条线路都可运行。

## 关键代码

```ts
const qwen = createOpenAICompatible({
  name: 'qwen-compatible',
  apiKey: env.QWEN_API_KEY,
  baseURL: env.QWEN_BASE_URL,
});

const deepseek = createOpenAICompatible({
  name: 'deepseek-compatible',
  apiKey: env.DEEPSEEK_API_KEY,
  baseURL: env.DEEPSEEK_BASE_URL,
});
```

## 为什么这样设计

- 接入层统一后，业务层只切 `provider` 标识，不关心厂商 SDK 差异
- 课程主线和扩展保持同一套接口结构，便于对比和复用

## 练习题

- 给前端增加 provider 默认值配置
- 比较同一输入在 Qwen 和 DeepSeek 下的输出差异

## 常见坑

- key / baseUrl / modelName 只配了 key，导致请求走错地址
- 把 provider 配置散落在多个文件，后续维护困难
