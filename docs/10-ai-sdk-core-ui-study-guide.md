# AI SDK Core + UI 全量学习指南（官方文档版）

> 适用对象：希望系统掌握 AI SDK Core 与 AI SDK UI 的开发者。  
> 学习方式：每章先看“核心重要知识点”，再看“常见使用方式”，最后做“自检题”。

## 章节导航

### AI SDK Core（20 章）

1. Core Overview  
2. Provider & Model Management  
3. Settings  
4. Generating Text  
5. Generating Structured Data  
6. Tool Calling  
7. Language Model Middleware  
8. Event Callbacks  
9. Error Handling  
10. Telemetry  
11. Testing  
12. Prompt Engineering  
13. Model Context Protocol (MCP)  
14. Embeddings  
15. Reranking  
16. Image Generation  
17. Video Generation  
18. Speech  
19. Transcription  
20. DevTools  

### AI SDK UI（14 章）

21. UI Overview  
22. Chatbot  
23. Chatbot Tool Usage  
24. Chatbot Message Persistence  
25. Chatbot Resume Streams  
26. Completion  
27. Object Generation  
28. Generative User Interfaces  
29. Message Metadata  
30. Transport  
31. Stream Protocols  
32. Reading UIMessage Streams  
33. Streaming Custom Data  
34. UI Error Handling  

---

## 第 1 章：AI SDK Core Overview

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/overview

### 核心重要知识点

- AI SDK Core 是模型调用与多模态能力的底层统一层，核心目标是“同一套调用方式对接多 provider”。  
- 文本、结构化输出、工具调用、图像/音频/视频等能力都围绕统一调用模式展开。  
- Core 更关注“模型交互逻辑”，UI 层关注“交互体验与流式渲染”。

### 常见使用方式

- 用 `generateText` / `streamText` 作为大多数 LLM 场景的主入口。  
- 先把 provider 与 model 封装成工厂，再在业务层传入 `prompt/messages`。  
- 需要可观测性时，统一记录 `usage`、`finishReason`、`providerMetadata`。

### 自检题

- 你如何向同事解释 Core 与 UI 的职责边界？  
自检点：是否能说清“Core 负责能力，UI 负责呈现”。  
- 如果后续要切模型厂商，你的业务层是否需要大改？  
自检点：是否已抽象 provider/model 而非写死。

## 第 2 章：Provider & Model Management

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/provider-management

### 核心重要知识点

- provider 管理的核心是把 `API Key / baseURL / modelName` 与业务逻辑解耦。  
- 同一功能可在不同模型间切换，关键是保持输入输出契约一致。  
- 多环境（dev/staging/prod）应通过配置控制 provider，而不是改代码。

### 常见使用方式

- 构建 `getLanguageModel({ provider })` 工厂，根据枚举返回模型实例。  
- 为不同任务选择不同模型：如快速模型用于聊天，高质量模型用于结构化生成。  
- 预留 fallback 策略：主模型失败时自动切备用模型。

### 自检题

- 你的项目里“换模型”是改配置还是改业务代码？  
自检点：答案应偏向改配置。  
- 如何做 provider fallback 才不影响上层接口？  
自检点：输入/输出 schema 保持一致。

## 第 3 章：Settings

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/settings

### 核心重要知识点

- Settings 是模型行为控制面板，常见包括 `temperature`、`maxTokens`、`topP`、`stop` 等。  
- 不同 provider 支持项不同，应明确“通用参数 + provider 专属参数”。  
- 设置的目标是“稳定性与可控性”，不是盲目提高随机性。

### 常见使用方式

- 结构化输出场景降低 `temperature`，提高可复现性。  
- 长输出任务配合 `maxTokens` 与分步生成，减少截断风险。  
- 将默认 settings 放在统一配置层，业务层按需覆盖局部参数。

### 自检题

- 什么场景下你会主动把 `temperature` 调低？  
自检点：应提到结构化提取、规则化输出等。  
- `maxTokens` 太小会导致什么现象？  
自检点：输出被截断或信息不完整。

## 第 4 章：Generating Text

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/generating-text

### 核心重要知识点

- 核心接口是 `generateText`（一次性）与 `streamText`（流式）。  
- 返回值不只有文本，还包含 `usage`、`finishReason`、`toolCalls`、`providerMetadata` 等。  
- 流式场景要消费流并处理错误事件，不能只关注最终字符串。

### 常见使用方式

- 非实时任务（总结、改写、批处理）优先 `generateText`。  
- 聊天 UI 或长回答场景使用 `streamText`，前端边收边渲染。  
- 在 `onFinish/onError` 统一记录调用成本、延迟与失败原因。

### 自检题

- 何时选 `generateText`，何时选 `streamText`？  
自检点：是否能从交互实时性和系统复杂度解释。  
- 你在文本生成里会记录哪些关键指标？  
自检点：至少包含 usage、finishReason、error。

## 第 5 章：Generating Structured Data

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

### 核心重要知识点

- 结构化生成强调“模型输出必须符合 schema”。  
- 通过 schema 约束可减少后处理成本，显著提升可编排性。  
- 结构化输出不是“更智能”，而是“更可验证、更可自动化”。

### 常见使用方式

- 用对象 schema 生成分类结果、任务拆解、表单数据。  
- 对模型输出做严格校验，失败时触发重试或降级流程。  
- 在 Agent 流程里把结构化结果直接作为下一步工具输入。

### 自检题

- 为什么结构化输出比自由文本更适合自动化流程？  
自检点：提到可验证性与稳定接口。  
- 如果 schema 校验失败，你的系统怎么处理？  
自检点：应有重试、纠错或回退策略。

## 第 6 章：Tool Calling

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

### 核心重要知识点

- Tool Calling 让模型把“需要执行的动作”外包给工具，形成可控 agent 闭环。  
- 每个工具都应有清晰 `name/description/input schema/execute`。  
- 工具是系统边界：权限、超时、错误处理必须显式设计。

### 常见使用方式

- 将外部能力（检索、数据库、业务 API）封装为工具供模型调用。  
- 对高风险工具增加人工确认或策略校验（如删除、写入类操作）。  
- 工具执行结果标准化返回，便于模型继续推理或总结。

### 自检题

- 一个可上线工具最少应包含哪些定义？  
自检点：name/description/schema/execute/错误策略。  
- 为什么不能把所有业务逻辑都交给模型直接输出？  
自检点：应提到可控性、安全性与可审计性。

## 第 7 章：Language Model Middleware

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/middleware

### 核心重要知识点

- Middleware 用于在模型调用前后做统一增强：改写 prompt、打标、审计、限流等。  
- 中间件把横切关注点从业务代码中抽离，提升一致性。  
- 多中间件组合时要关注执行顺序与可观察性。

### 常见使用方式

- 在请求前自动注入系统提示词、用户上下文或安全策略。  
- 在响应后统一脱敏、敏感词检测、成本上报。  
- 为不同租户动态附加策略，实现多租户隔离控制。

### 自检题

- 哪些逻辑适合做 middleware，而不是写在每个业务函数里？  
自检点：横切、复用、高一致性逻辑。  
- 多个 middleware 串联时最容易踩什么坑？  
自检点：顺序、副作用、重复处理。

## 第 8 章：Event Callbacks

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/event-listeners

### 核心重要知识点

- Event Callbacks 是观测模型生命周期的关键点，如 chunk、finish、error。  
- 回调让你能在“生成过程中”介入，而不只在结束后处理。  
- 回调设计应尽量轻量，避免阻塞主流程。

### 常见使用方式

- 在 `onChunk` 做实时日志、实时 UI 进度、敏感内容早期拦截。  
- 在 `onFinish` 汇总 usage、输出质量评分、入库。  
- 在 `onError` 统一上报告警并绑定请求上下文。

### 自检题

- 你会把哪些逻辑放在 `onFinish`，哪些放在 `onChunk`？  
自检点：是否能按实时性区分。  
- 为什么回调中不建议写重型同步操作？  
自检点：会影响吞吐与延迟。

## 第 9 章：Error Handling

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/error-handling

### 核心重要知识点

- AI 系统常见错误包括 provider 错误、限流、超时、解析失败、工具执行失败。  
- 错误处理要区分“可重试”与“不可重试”。  
- 用户可见错误信息应可理解，内部错误日志应可定位。

### 常见使用方式

- 构建统一错误映射层，把 provider 原始错误归一化。  
- 对网络抖动/限流等可重试错误实施指数退避重试。  
- 记录 request id、model、prompt 摘要、工具链路用于排障。

### 自检题

- 你如何定义“可重试错误”？  
自检点：临时性、幂等性、重试成本。  
- 用户提示文案和内部日志内容应如何区分？  
自检点：前者友好，后者可诊断。

## 第 10 章：Telemetry

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/telemetry

### 核心重要知识点

- Telemetry 关注调用成本、时延、成功率、质量指标。  
- 没有观测就无法做稳定性优化与成本优化。  
- 观测指标应覆盖模型调用与工具调用两条链路。

### 常见使用方式

- 统计每请求 token 消耗、平均响应时间、错误率。  
- 按模型与场景维度做看板，定位“高成本低收益”路径。  
- 与告警系统联动，异常峰值触发报警。

### 自检题

- 你当前最缺失的 AI 观测指标是什么？  
自检点：是否能回答到可行动层面。  
- 如何判断某个模型版本“值得继续使用”？  
自检点：成本、质量、稳定性综合评估。

## 第 11 章：Testing

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/testing

### 核心重要知识点

- AI 测试要覆盖功能正确性、结构正确性、鲁棒性与回归稳定性。  
- 仅靠“看起来像对的”人工测试不够，需自动化校验。  
- 对生成式系统，断言策略通常比传统单元测试更灵活。

### 常见使用方式

- 对结构化输出做 schema 断言。  
- 用固定输入集做回归测试，比较关键字段和指标波动。  
- 对工具调用路径做端到端测试，验证参数与顺序。

### 自检题

- 你的 AI 测试用例如何避免过度依赖完全一致文本？  
自检点：应提到语义/结构断言。  
- 回归测试最值得固定的样本是什么？  
自检点：高价值、高风险、历史易错样本。

## 第 12 章：Prompt Engineering

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/prompt-engineering

### 核心重要知识点

- Prompt Engineering 的本质是“让模型更稳定地完成明确任务”。  
- 高质量 prompt 通常包含角色、目标、约束、输出格式与示例。  
- prompt 应版本化管理，避免散落在业务代码中。

### 常见使用方式

- 结构化任务中把 schema 要求写清楚并附输入输出示例。  
- 对多轮任务采用分步 prompt，降低一次性复杂度。  
- A/B 对比不同 prompt 模板，量化质量收益。

### 自检题

- 一个你常用 prompt 模板包含哪些固定段落？  
自检点：角色/目标/约束/格式。  
- 为什么 prompt 也要做版本管理？  
自检点：可追踪、可回滚、可实验。

## 第 13 章：Model Context Protocol (MCP)

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools

### 核心重要知识点

- MCP 用统一协议把外部工具与上下文资源暴露给模型。  
- 它的价值在于“标准化接入”，减少自定义集成成本。  
- 引入 MCP 后仍需权限边界与安全策略，不是默认安全。

### 常见使用方式

- 通过 MCP 连接检索、知识库、业务服务，形成统一工具层。  
- 用 MCP 资源做上下文注入，提升回答相关性。  
- 对 MCP 工具做白名单与调用审计。

### 自检题

- MCP 解决了哪类工程问题？  
自检点：标准化工具与上下文接入。  
- MCP 引入后安全设计可以省略吗？  
自检点：不能，权限与审计仍必须做。

## 第 14 章：Embeddings

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/embeddings

### 核心重要知识点

- Embeddings 把文本映射到向量空间，用于语义检索与聚类。  
- 向量质量、切片策略与索引策略共同决定检索效果。  
- embedding 模型应与业务语言、领域术语匹配。

### 常见使用方式

- 构建 RAG：离线向量化文档 + 在线相似度召回。  
- 相似问题推荐、FAQ 去重、语义分类。  
- 为检索链路记录召回率与命中质量指标。

### 自检题

- 为什么“分块策略”会影响最终问答效果？  
自检点：语义完整性与召回粒度。  
- Embeddings 适合做关键词检索替代吗？  
自检点：语义检索强，但需结合关键词策略。

## 第 15 章：Reranking

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/reranking

### 核心重要知识点

- Reranking 在初召回结果上做二次排序，提升相关性。  
- 它常与 Embeddings 检索串联，是 RAG 精度优化关键环节。  
- 重排成本高于初召回，应控制候选数量。

### 常见使用方式

- 先向量召回 topK，再 rerank 得到更高质量 topN。  
- 查询复杂或业务准确率要求高时开启 rerank。  
- 对不同 query 类型设动态 topK，平衡效果与成本。

### 自检题

- 为什么不直接把 topK 召回结果全给模型？  
自检点：噪声高、上下文浪费、成本增加。  
- 什么时候 reranking 的收益最明显？  
自检点：候选多且语义相近的场景。

## 第 16 章：Image Generation

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/image-generation

### 核心重要知识点

- 图像生成通常包含 prompt、尺寸、质量与风格等参数。  
- 多 provider 图像能力差异明显，需要能力探测与降级方案。  
- 输出后处理（存储、审核、水印）是生产落地重点。

### 常见使用方式

- 营销图、封面图、草图探索等场景生成图片素材。  
- 对输入 prompt 做安全过滤，对输出图做合规审查。  
- 记录生成参数以支持复现与问题追踪。

### 自检题

- 图像生成上线后你最先监控什么？  
自检点：成功率、时延、合规失败率。  
- 如何复现一张历史生成图片？  
自检点：保留 prompt 与关键参数。

## 第 17 章：Video Generation

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/video-generation

### 核心重要知识点

- 视频生成通常是异步长任务，需任务状态管理。  
- 生成时间与成本普遍高于文本/图像，需限额与排队策略。  
- 输出资产较大，存储与分发链路要提前设计。

### 常见使用方式

- 提交生成任务后轮询或回调获取状态与结果。  
- 对任务设置超时、重试与取消机制。  
- 对外提供“生成中/已完成/失败原因”的用户态反馈。

### 自检题

- 视频生成为什么更适合异步架构？  
自检点：任务耗时长、资源重。  
- 若任务失败，你会返回哪些可行动信息给用户？  
自检点：失败原因、可重试建议、上下文保留。

## 第 18 章：Speech

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/speech

### 核心重要知识点

- Speech 侧重文本到语音（TTS）能力。  
- 关键维度包括音色、语速、格式与延迟。  
- 实时语音体验要关注流式输出与播放器缓冲策略。

### 常见使用方式

- 聊天机器人回复转语音，用于语音助手场景。  
- 教学内容、通知信息自动配音。  
- 针对移动端选择合适编码格式平衡音质与带宽。

### 自检题

- TTS 场景中你会优先优化“自然度”还是“延迟”？为什么？  
自检点：能结合业务场景解释。  
- 音频格式选择会影响什么？  
自检点：体积、兼容性、播放延迟。

## 第 19 章：Transcription

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/transcription

### 核心重要知识点

- Transcription 负责语音转文本（ASR）。  
- 准确率受音频质量、口音、噪声、专业术语影响。  
- 转写后通常需要标点修复、分段与说话人处理。

### 常见使用方式

- 会议纪要、客服录音、教学音频转文本。  
- 结合术语词表提升垂直领域识别准确率。  
- 转写结果与原音频片段绑定，支持人工复核。

### 自检题

- 你会如何评估 ASR 质量？  
自检点：准确率、可读性、业务可用性。  
- 语音转写后为什么还要做文本后处理？  
自检点：结构化与可读性需求。

## 第 20 章：DevTools

官方文档：https://ai-sdk.dev/docs/ai-sdk-core/devtools

### 核心重要知识点

- DevTools 用于提升开发调试效率，帮助你看清调用细节。  
- 重点价值是快速定位“prompt 问题、参数问题、provider 问题”。  
- 调试工具应与 Telemetry 配合，形成开发到线上的一致观测。

### 常见使用方式

- 在开发环境观察请求参数、响应结构、错误上下文。  
- 排查流式中断、工具调用参数异常、结构化校验失败。  
- 与日志平台联动，缩短问题定位时间。

### 自检题

- 你最近一次模型问题排查卡在什么环节？  
自检点：能否映射到可观测缺口。  
- DevTools 和 Telemetry 的分工是什么？  
自检点：前者开发调试，后者持续运行观测。

## 第 21 章：AI SDK UI Overview

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/overview

### 核心重要知识点

- AI SDK UI 提供前端侧高层抽象，简化聊天、流式渲染、消息状态管理。  
- UI 层围绕 `UIMessage` 与传输协议展开。  
- UI 与 Core 的协作方式是：后端生成流，前端按协议消费并渲染。

### 常见使用方式

- 在 React/Next 应用中快速搭建聊天界面。  
- 复用 SDK 的消息管理与请求生命周期能力，减少手写状态机。  
- 通过 metadata 与 data stream 扩展富交互体验。

### 自检题

- UI 层为什么不直接替代 Core？  
自检点：定位不同，UI 是上层抽象。  
- `UIMessage` 在体系里的作用是什么？  
自检点：统一消息结构与渲染输入。

## 第 22 章：Chatbot

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/chatbot

### 核心重要知识点

- Chatbot 章节聚焦基于 hooks 快速构建聊天应用。  
- 关键是管理 `messages`、输入状态、发送动作与流式响应。  
- 聊天组件应处理首屏、加载态、失败态与重试。

### 常见使用方式

- 用 `useChat` 维护消息列表并驱动 UI 更新。  
- 在发送前做输入校验与上下文拼装。  
- 为消息项增加“复制、重试、继续生成”等操作。

### 自检题

- 你的聊天页在流式回答中如何处理滚动与打字感？  
自检点：是否有流式 UI 细节策略。  
- `useChat` 帮你省去了哪类状态管理复杂度？  
自检点：消息、请求状态、流处理。

## 第 23 章：Chatbot Tool Usage

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage

### 核心重要知识点

- UI 需要能展示“工具调用过程”与“工具结果”，而不只是最终文本。  
- 工具态可视化可显著提升用户信任与可解释性。  
- 前后端要对齐工具消息协议，避免渲染歧义。

### 常见使用方式

- 在消息中渲染工具状态：调用中、成功、失败。  
- 对结果型工具输出做专用组件展示（如卡片、表格）。  
- 对高风险工具加入显式确认步骤。

### 自检题

- 为什么工具调用信息要让用户看见？  
自检点：可解释性与可控性。  
- 工具失败时 UI 最少应展示哪些信息？  
自检点：失败原因、重试入口、上下文。

## 第 24 章：Chatbot Message Persistence

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence

### 核心重要知识点

- 消息持久化是从 demo 到产品的关键一步。  
- 持久化不只存文本，还应包含角色、时间戳、metadata、工具信息。  
- 会话恢复需保证消息顺序与一致性。

### 常见使用方式

- 以会话 ID 为主键保存消息历史。  
- 首屏加载最近消息并支持分页回溯。  
- 对草稿与失败消息设置单独状态，避免污染正式记录。

### 自检题

- 如果只存 assistant 文本，会损失哪些能力？  
自检点：工具过程、metadata、审计信息。  
- 会话恢复最容易出现的 bug 是什么？  
自检点：顺序错乱或重复消息。

## 第 25 章：Chatbot Resume Streams

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams

### 核心重要知识点

- Resume Streams 用于网络中断后的流恢复，减少用户损失。  
- 断点续传依赖稳定的消息 ID 与流状态管理。  
- 恢复机制必须处理“重复片段”与“缺失片段”问题。

### 常见使用方式

- 在客户端保存最近流状态，重连后请求恢复。  
- 服务端提供可恢复的流上下文或会话快照。  
- 恢复后做去重合并，确保最终消息一致。

### 自检题

- 断网恢复时如何避免重复文本？  
自检点：基于 chunk/message id 去重。  
- 没有持久化时，resume 会遇到什么问题？  
自检点：无法确定恢复起点。

## 第 26 章：Completion

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/completion

### 核心重要知识点

- Completion 适合单输入单输出的补全型场景。  
- 与多轮 chat 相比，状态模型更轻，接入更快。  
- 仍需处理流式、错误、取消等基础交互能力。

### 常见使用方式

- 写作补全、标题建议、代码片段续写。  
- 输入框边打边触发建议，提升编辑效率。  
- 在生成前后做长度与语气控制。

### 自检题

- 你的场景更适合 Completion 还是 Chat？  
自检点：看是否依赖多轮上下文。  
- Completion 也需要流式吗？为什么？  
自检点：实时反馈能提升体感与可控性。

## 第 27 章：Object Generation

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/object-generation

### 核心重要知识点

- UI 场景也可直接消费结构化对象，而不必先转自由文本。  
- 结构化对象让前端组件渲染更稳定、类型更清晰。  
- 需要把 schema 与组件契约严格对齐。

### 常见使用方式

- 让模型生成表单建议、卡片数据、任务列表对象。  
- 对对象字段做前端二次校验后再渲染。  
- 结构化失败时回退到文本解释模式。

### 自检题

- 为什么对象生成对前端更友好？  
自检点：类型稳定，组件可直接消费。  
- schema 变更后要同步哪些层？  
自检点：模型约束、接口、UI 渲染。

## 第 28 章：Generative User Interfaces

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

### 核心重要知识点

- Generative UI 强调“模型返回可驱动 UI 的结构化内容/动作”。  
- 前端不是被动展示文本，而是根据消息类型渲染不同组件。  
- 安全边界仍由前端与服务端控制，不能让模型直接执行任意 UI 行为。

### 常见使用方式

- 根据消息 part 类型渲染图表、表单、结果卡片。  
- 把工具结果映射为可交互控件，提高任务完成效率。  
- 对模型建议动作加入可见确认按钮。

### 自检题

- 生成式 UI 与传统聊天 UI 的最大区别是什么？  
自检点：从文本展示转向组件驱动。  
- 为什么要对“模型建议动作”做显式确认？  
自检点：权限控制与误操作防护。

## 第 29 章：Message Metadata

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/message-metadata

### 核心重要知识点

- metadata 用于承载消息附加信息，如来源、评分、耗时、标签。  
- 它让 UI 能展示更多业务上下文，而不污染正文内容。  
- metadata 结构应稳定并可扩展，避免后续兼容问题。

### 常见使用方式

- 在消息旁展示模型名称、token 消耗、工具调用次数。  
- 打上审核状态、业务标签，支持筛选与统计。  
- 持久化 metadata 供后续分析与回放。

### 自检题

- 哪些信息适合放 metadata，而不是正文？  
自检点：系统属性、观测信息、业务标签。  
- metadata 设计最怕什么？  
自检点：随意扩展导致前后端契约混乱。

## 第 30 章：Transport

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/transport

### 核心重要知识点

- Transport 定义前端如何与后端 AI 接口通信。  
- 良好 transport 设计可支持鉴权、重试、超时、自定义 headers。  
- 传输层是可替换的，业务层应避免耦合底层实现。

### 常见使用方式

- 默认使用标准 HTTP 传输，按需注入认证信息。  
- 在 transport 层统一处理请求签名与租户标识。  
- 对慢请求设置超时与取消策略。

### 自检题

- 为什么建议把鉴权逻辑放 transport 层统一处理？  
自检点：避免重复与泄漏风险。  
- transport 可替换对工程有什么好处？  
自检点：便于演进与多端复用。

## 第 31 章：Stream Protocols

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol

### 核心重要知识点

- Stream Protocol 定义流式消息在前后端之间的格式约定。  
- 协议一致性决定了前端是否能正确解析文本、工具、数据事件。  
- 设计时要考虑扩展字段与向后兼容。

### 常见使用方式

- 使用官方推荐协议输出，减少自定义解析风险。  
- 在协议层明确事件类型与边界（开始、增量、结束、错误）。  
- 升级协议版本时保留兼容处理逻辑。

### 自检题

- 流协议不统一时，前端最常见故障是什么？  
自检点：解析失败、消息错位、渲染异常。  
- 为什么协议要显式区分“增量事件”和“完成事件”？  
自检点：状态收敛与 UI 收尾逻辑。

## 第 32 章：Reading UIMessage Streams

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/reading-ui-message-streams

### 核心重要知识点

- UIMessage Stream 读取是前端流式体验的核心。  
- 你需要处理多类型消息片段，而不是只拼接纯文本。  
- 读取流程要正确收尾，确保最终消息状态一致。

### 常见使用方式

- 在客户端按事件逐步更新当前消息内容。  
- 根据消息 part 类型分发到不同渲染组件。  
- 对异常中断做 graceful fallback（保留已收到内容）。

### 自检题

- 为什么“只拼接文本”在复杂场景下不够？  
自检点：还有工具/数据/元信息事件。  
- 流读取结束时你会做哪两件关键事？  
自检点：状态收敛与资源清理。

## 第 33 章：Streaming Custom Data

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data

### 核心重要知识点

- 除了模型文本，还可以流式传输自定义业务数据。  
- 自定义数据流可用于进度、检索命中、阶段状态等实时反馈。  
- 数据事件必须定义稳定格式，否则前端难以维护。

### 常见使用方式

- 在生成过程中推送“检索中/工具执行中/已完成”进度。  
- 同步推送中间产物，让用户提前看到部分价值。  
- 使用统一 data type 字段区分不同自定义事件。

### 自检题

- 你的场景里最值得流式推送的自定义数据是什么？  
自检点：是否能提升等待体验与可解释性。  
- 自定义数据事件如何避免和正文消息混淆？  
自检点：明确 type 和解析分发规则。

## 第 34 章：AI SDK UI Error Handling

官方文档：https://ai-sdk.dev/docs/ai-sdk-ui/error-handling

### 核心重要知识点

- UI 错误处理重点是“用户可恢复”，而不只是“报错可见”。  
- 需要区分网络错误、协议错误、服务错误、用户操作错误。  
- 流式场景下错误可能发生在中途，UI 必须支持部分结果保留。

### 常见使用方式

- 在消息级显示错误状态并提供重试按钮。  
- 对可恢复错误自动重试，对不可恢复错误给出明确引导。  
- 把错误上下文回传日志系统，支持后端联查。

### 自检题

- 聊天中途失败时，为什么要保留已收到内容？  
自检点：保护用户感知价值，便于恢复。  
- “可恢复错误”在 UI 上最小交互闭环是什么？  
自检点：提示原因 + 可执行重试动作。

---

## 复盘建议

- 先跑通第 1-6 章（Core 基础链路），再做第 21-25 章（UI 聊天主线）。  
- 把第 9、10、11、34 章作为上线前必查清单（错误、观测、测试、UI 兜底）。  
- 任何新需求先判断是“Core 能力扩展”还是“UI 交互扩展”，再落实现有架构。
