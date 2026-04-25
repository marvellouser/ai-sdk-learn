# 最终综合 Demo

## Demo 目标

用一套前后端分离应用，同时展示两类 Agent：

- 学习教练 Agent
- 需求分析 Agent

## 对应官方文档

- [Agents Overview](https://ai-sdk.dev/docs/agents/overview)
- [Reference: `ToolLoopAgent`](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent)
- [Reference: `useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)

## 共享基础设施

- 同一套 Next 聊天 UI
- 同一套 Express 流式 API
- 同一个 provider 工厂
- 同一组本地工具

## 学习教练 Agent

输入：

- 学习目标
- 每天时长
- 总天数

输出：

- 阶段计划
- 每日任务
- 风险提醒
- 下一步动作

## 需求分析 Agent

输入：

- 产品想法
- 目标用户
- 时间限制

输出：

- PRD 提纲
- 核心流程
- 接口建议
- 任务拆解

## 你应该重点复盘什么

- 哪些能力适合做成 lesson
- 哪些能力必须在真实 Agent 中组合起来
- 哪些逻辑该让工具做，哪些逻辑该留给模型
