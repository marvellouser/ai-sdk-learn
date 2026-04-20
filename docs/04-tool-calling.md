# 第 4 章：Tool Calling

## 这一章学什么

- `tool()` 的参数设计
- 什么时候该调用工具，什么时候直接生成
- 工具返回值应该尽量稳定、业务化

## 对应官方文档

- [Reference: `tool`](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool)
- [Reference: Tool Calling with `generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)

## 功能目标

让模型先计算学习负载，再生成建议。

## 关键代码

```ts
estimateStudyLoad: tool({
  description: '根据每天可投入时间估算总学习时长',
  parameters: z.object({
    goal: z.string(),
    minutesPerDay: z.number(),
    daysAvailable: z.number(),
  }),
  execute: async ({ minutesPerDay, daysAvailable }) => ({
    totalHours: (minutesPerDay * daysAvailable) / 60,
  }),
});
```

## 为什么这样设计

- 工具负责“确定性部分”
- 模型负责“解释和组织表达”

## 练习题

- 新增一个工具，把任务按轻重缓急排序
- 让工具输出里补充一个风险提醒字段

## 常见坑

- 工具做得太大，变成一个迷你业务系统
- 参数 schema 太松，导致模型乱传值
