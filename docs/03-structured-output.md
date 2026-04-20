# 第 3 章：结构化输出

## 这一章学什么

- 最新的 `Output.object()` 写法
- 为什么结构化输出比“让模型返回 JSON 字符串”更稳定
- 如何用 Zod 约束学习计划

## 对应官方文档

- [Reference: `Output.object`](https://ai-sdk.dev/docs/reference/ai-sdk-core/output)
- [Reference: `generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)

## 功能目标

把学习意图转成一个 7 天学习计划对象。

## 关键代码

```ts
const result = await generateText({
  model,
  output: Output.object({
    schema: studyPlanSchema,
    name: 'studyPlan',
  }),
  prompt,
});
```

## 为什么这样设计

- 对象结果天然适合前端卡片化展示
- schema 可以成为“课程设计稿”，先定输出再写 UI

## 练习题

- 给阶段对象增加 `deliverable`
- 把 7 天计划扩展成 14 天

## 常见坑

- schema 定得过大，一次生成难度太高
- 把结构化输出和工具调用误以为必须分开，其实可以组合
