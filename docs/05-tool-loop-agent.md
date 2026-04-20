# 第 5 章：ToolLoopAgent

## 这一章学什么

- 什么情况下该上多步 Agent
- `stopWhen` 控制循环边界
- `prepareStep` 控制某一步可用工具

## 对应官方文档

- [Agents Overview](https://ai-sdk.dev/docs/agents/overview)
- [Reference: `ToolLoopAgent`](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent)
- [Reference: `stepCountIs`](https://ai-sdk.dev/docs/reference/ai-sdk-core/step-count-is)

## 功能目标

做一个会自动拆计划的学习教练 Agent。

## 关键代码

```ts
const agent = new ToolLoopAgent({
  model,
  instructions,
  tools: sharedTools,
  stopWhen: stepCountIs(5),
  prepareStep: ({ stepNumber }) => {
    if (stepNumber === 0) {
      return { activeTools: ['estimateStudyLoad', 'buildStageTemplate'] };
    }
    return {};
  },
});
```

## 为什么这样设计

- 第一轮先让 Agent 调工具拿事实
- 后面几轮再把事实组织成自然语言建议

## 练习题

- 给 analyst Agent 单独配置不同 stopWhen
- 在 onFinish 里记录总步数和 usage

## 常见坑

- 没有 stopWhen，导致 Agent 过度循环
- 把每个问题都塞给 Agent，而不是先想清楚是否真的需要多步
