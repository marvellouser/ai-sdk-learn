# 第 1 章：Provider 接入与第一条调用

## 这一章学什么

- 为什么先抽象 provider 工厂，再写业务调用
- 如何通过 OpenAI 兼容协议接入 Qwen / DeepSeek
- 为什么这套课程不使用 AI Gateway

## 对应官方文档

- [Foundations: Providers and Models](https://ai-sdk.dev/docs/foundations/providers-and-models)
- [OpenAI-compatible providers](https://ai-sdk.dev/providers/openai-compatible-providers)
- [Reference: AI SDK Core](https://ai-sdk.dev/docs/reference/ai-sdk-core)

## 功能目标

做一个“学习目标澄清器”。
输入一句模糊目标，例如“我想学 agent”，返回：

- 更清晰的目标表达
- 为什么值得学
- 第一个动作

## 关键代码

服务端在 `server/src/lib/provider.ts` 里用 `createOpenAICompatible` 封装模型提供方，再在 `lesson-1` 里调用：

```ts
const { model } = getLanguageModel({ provider: 'qwen' });

const result = await generateText({
  model,
  output: Output.object({
    schema: refinedGoalSchema,
  }),
  prompt: `请把下面这个学习目标改写得更清晰...`,
});
```

## 为什么这样设计

- provider 层只认 `key + baseUrl + modelName`，切换模型源不改业务逻辑
- 第一章直接返回对象结构，后面接 UI 会更稳定

## 练习题

- 把 provider 从 `qwen` 切换到 `deepseek`
- 改 `QWEN_MODEL_NAME`，比较输出风格差异

## 常见坑

- 忘了配置 `QWEN_API_KEY` 或 `QWEN_BASE_URL`
- 直接在业务代码里写死 baseURL 和 modelName
