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

### 代码示例

```ts
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 一次性生成
const { text, usage, finishReason } = await generateText({
  model: openai('gpt-4o'),
  prompt: '用一句话解释什么是 AI SDK',
});

// 流式生成
const result = streamText({
  model: openai('gpt-4o'),
  prompt: '列举 AI SDK Core 的三大核心能力',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### 自检题

- 你如何向同事解释 Core 与 UI 的职责边界？  
自检点：是否能说清”Core 负责能力，UI 负责呈现”。  
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

### 代码示例

```ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

// 用工厂函数创建 provider，业务层不关心底层细节
function getProvider(name: 'qwen' | 'deepseek') {
  const config = {
    qwen: { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey: process.env.QWEN_API_KEY! },
    deepseek: { baseURL: 'https://api.deepseek.com/v1', apiKey: process.env.DEEPSEEK_API_KEY! },
  };
  return createOpenAICompatible({ name, ...config[name] });
}

// 业务层只传 provider 名称，切换模型不改业务代码
const provider = getProvider('qwen');
const { text } = await generateText({
  model: provider('qwen-plus'),
  prompt: '你好',
});

// Fallback 策略
async function generateWithFallback(prompt: string) {
  try {
    return await generateText({ model: getProvider('qwen')('qwen-plus'), prompt });
  } catch {
    return await generateText({ model: getProvider('deepseek')('deepseek-chat'), prompt });
  }
}
```

### 自检题

- 你的项目里”换模型”是改配置还是改业务代码？  
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

### 代码示例

```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 结构化输出：低 temperature 提高稳定性
const { text } = await generateText({
  model: openai('gpt-4o'),
  temperature: 0,
  maxTokens: 2048,
  topP: 0.9,
  prompt: '提取以下文本中的人名和地点...',
});

// 创意场景：适当提高 temperature
const { text: story } = await generateText({
  model: openai('gpt-4o'),
  temperature: 0.8,
  maxTokens: 4096,
  prompt: '写一个关于时间旅行的短故事',
});

// 统一默认配置，业务层按需覆盖
const defaultSettings = { temperature: 0.2, maxTokens: 2048 };

const { text: summary } = await generateText({
  model: openai('gpt-4o'),
  ...defaultSettings,
  maxTokens: 512, // 局部覆盖
  prompt: '总结这段文字',
});
```

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

### 代码示例

```ts
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 一次性生成：适合总结、改写、批处理
const { text, usage, finishReason } = await generateText({
  model: openai('gpt-4o'),
  prompt: '用三句话总结量子计算的核心原理',
});
console.log(`Tokens: ${usage.totalTokens}, Finish: ${finishReason}`);

// 流式生成：适合聊天 UI、长回答
const result = streamText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'system', content: '你是一位技术顾问' },
    { role: 'user', content: '解释微服务架构的优缺点' },
  ],
  onFinish({ text, usage, finishReason }) {
    console.log(`完成: ${finishReason}, tokens: ${usage.totalTokens}`);
  },
  onError({ error }) {
    console.error('生成失败:', error);
  },
});

// 消费流
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

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

### 代码示例

```ts
import { generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// 一次性生成结构化对象
const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    category: z.enum(['bug', 'feature', 'question']),
    priority: z.enum(['low', 'medium', 'high']),
    summary: z.string().describe('一句话摘要'),
    tags: z.array(z.string()),
  }),
  prompt: '分类这条反馈：登录页面在 Safari 上白屏，急需修复',
});
console.log(object.category); // 'bug'

// 流式生成结构化对象（边生成边渲染）
const result = streamObject({
  model: openai('gpt-4o'),
  schema: z.object({
    steps: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })),
  }),
  prompt: '拆解"搭建 RAG 系统"为可执行步骤',
});

for await (const partialObject of result.partialObjectStream) {
  console.log(partialObject); // 逐步填充的部分对象
}
```

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

### 代码示例

```ts
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { text, toolCalls, toolResults } = await generateText({
  model: openai('gpt-4o'),
  tools: {
    getWeather: tool({
      description: '获取指定城市的天气信息',
      parameters: z.object({
        city: z.string().describe('城市名称'),
      }),
      execute: async ({ city }) => {
        // 实际场景调用天气 API
        return { city, temp: 22, condition: '晴' };
      },
    }),
    searchDocs: tool({
      description: '搜索内部文档',
      parameters: z.object({
        query: z.string(),
        limit: z.number().default(5),
      }),
      execute: async ({ query, limit }) => {
        return { results: [`关于 ${query} 的文档1`, `关于 ${query} 的文档2`] };
      },
    }),
  },
  maxSteps: 5, // 允许多轮工具调用
  prompt: '北京今天天气怎么样？',
});

console.log(text);        // 模型基于工具结果生成的最终回答
console.log(toolCalls);   // [{ toolName: 'getWeather', args: { city: '北京' } }]
console.log(toolResults); // [{ toolName: 'getWeather', result: { city: '北京', temp: 22, ... } }]
```

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

### 代码示例

```ts
import { generateText, wrapLanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';

// 定义中间件：在请求前注入系统提示词，在响应后记录日志
const loggingMiddleware = {
  transformParams: async ({ params }) => {
    console.log(`[请求] model=${params.model}, prompt长度=${JSON.stringify(params.prompt).length}`);
    return {
      ...params,
      // 自动注入安全策略提示词
      prompt: {
        ...params.prompt,
        system: `${params.prompt.system ?? ''}\n请勿输出任何敏感信息。`,
      },
    };
  },
  wrapGenerate: async ({ doGenerate }) => {
    const start = Date.now();
    const result = await doGenerate();
    console.log(`[响应] 耗时=${Date.now() - start}ms, tokens=${result.usage.totalTokens}`);
    return result;
  },
};

// 用 wrapLanguageModel 包装原始模型
const wrappedModel = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: loggingMiddleware,
});

const { text } = await generateText({
  model: wrappedModel,
  prompt: '你好',
});
```

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

### 代码示例

```ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai('gpt-4o'),
  prompt: '详细解释 CQRS 架构模式',

  onChunk({ chunk }) {
    // 实时处理每个 chunk：日志、敏感词检测等
    if (chunk.type === 'text-delta') {
      // 可在此做敏感内容早期拦截
      if (chunk.textDelta.includes('机密')) {
        console.warn('[安全] 检测到敏感内容');
      }
    }
  },

  onFinish({ text, usage, finishReason }) {
    // 汇总指标入库
    console.log(`完成原因: ${finishReason}`);
    console.log(`Token 消耗: prompt=${usage.promptTokens}, completion=${usage.completionTokens}`);
    // db.insert({ text, usage, finishReason, timestamp: Date.now() });
  },

  onError({ error }) {
    // 统一告警上报
    console.error('[告警] 生成失败:', error.message);
    // alertService.notify({ error, context: 'streamText' });
  },
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

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

### 代码示例

```ts
import { generateText, APICallError } from 'ai';
import { openai } from '@ai-sdk/openai';

// 统一错误处理 + 指数退避重试
async function generateWithRetry(prompt: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateText({
        model: openai('gpt-4o'),
        prompt,
      });
    } catch (error) {
      if (APICallError.isInstance(error)) {
        const { statusCode, message, requestBodyValues } = error;
        console.error(`[错误] status=${statusCode}, msg=${message}`);

        // 可重试：限流(429)、服务端错误(5xx)
        if (statusCode === 429 || (statusCode && statusCode >= 500)) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`第 ${attempt + 1} 次重试，等待 ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      throw error; // 不可重试错误直接抛出
    }
  }
  throw new Error('重试次数耗尽');
}
```

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

### 代码示例

```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 开启 OpenTelemetry 遥测
const { text, usage } = await generateText({
  model: openai('gpt-4o'),
  prompt: '解释 SOLID 原则',
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'explain-solid',       // 标识业务场景
    metadata: {
      userId: 'user-123',
      environment: 'production',
    },
  },
});

// 手动记录关键指标（配合自定义看板）
function logMetrics(scene: string, usage: { promptTokens: number; completionTokens: number; totalTokens: number }, latencyMs: number) {
  console.log(JSON.stringify({
    scene,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    latencyMs,
    timestamp: Date.now(),
  }));
}

const start = Date.now();
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: '什么是事件驱动架构？',
});
logMetrics('architecture-qa', result.usage, Date.now() - start);
```

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

### 代码示例

```ts
import { generateText, tool } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

describe('AI SDK 测试', () => {
  // 用 MockLanguageModelV1 模拟模型，不依赖真实 API
  it('应返回结构化工具调用', async () => {
    const mockModel = new MockLanguageModelV1({
      doGenerate: async () => ({
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: 'tool-calls',
        usage: { promptTokens: 10, completionTokens: 5 },
        toolCalls: [
          {
            toolCallType: 'function',
            toolCallId: 'call-1',
            toolName: 'getWeather',
            args: '{"city":"北京"}',
          },
        ],
      }),
    });

    const result = await generateText({
      model: mockModel,
      tools: {
        getWeather: tool({
          description: '获取天气',
          parameters: z.object({ city: z.string() }),
          execute: async ({ city }) => ({ city, temp: 22 }),
        }),
      },
      prompt: '北京天气',
    });

    expect(result.toolResults[0].result).toEqual({ city: '北京', temp: 22 });
  });

  // 对结构化输出做 schema 断言
  it('输出应符合 schema', async () => {
    const schema = z.object({
      category: z.enum(['bug', 'feature', 'question']),
      summary: z.string().min(1),
    });
    const output = { category: 'bug', summary: '登录白屏' };
    expect(schema.parse(output)).toEqual(output);
  });
});
```

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

### 代码示例

```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 结构化 prompt：角色 + 目标 + 约束 + 格式 + 示例
const { text } = await generateText({
  model: openai('gpt-4o'),
  messages: [
    {
      role: 'system',
      content: `你是一位资深技术文档编辑。
目标：将用户输入的技术概念改写为面向初学者的解释。
约束：不超过 3 句话，不使用英文缩写，用类比辅助理解。
输出格式：纯文本段落。`,
    },
    {
      role: 'user',
      content: '什么是 WebSocket？',
    },
  ],
});

// 分步 prompt：复杂任务拆成多轮
const { text: outline } = await generateText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'system', content: '你是技术博客作者' },
    { role: 'user', content: '为"微服务拆分策略"写一个大纲，列出 3-5 个要点' },
  ],
});

const { text: article } = await generateText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'system', content: '你是技术博客作者，根据大纲展开写作' },
    { role: 'user', content: `大纲如下：\n${outline}\n\n请展开第一个要点，200 字以内。` },
  ],
});
```

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

### 代码示例

```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai';

// 通过 stdio 连接本地 MCP Server
const mcpClient = await createMCPClient({
  transport: new StdioMCPTransport({
    command: 'node',
    args: ['./mcp-server.js'],
  }),
});

// 获取 MCP 暴露的工具
const tools = await mcpClient.tools();

const { text, toolCalls } = await generateText({
  model: openai('gpt-4o'),
  tools,       // 直接传入 MCP 工具
  maxSteps: 5,
  prompt: '查询最近的销售数据并生成摘要',
});

console.log(text);
console.log('工具调用记录:', toolCalls); // 可用于审计

// 使用完毕关闭连接
await mcpClient.close();

// SSE 方式连接远程 MCP Server
import { Experimental_SSEMCPTransport as SSEMCPTransport } from 'ai';

const remoteMcp = await createMCPClient({
  transport: new SSEMCPTransport({
    url: 'https://mcp.example.com/sse',
  }),
});
```

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

### 代码示例

```ts
import { embed, embedMany, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

// 单条文本向量化
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: '什么是向量数据库？',
});
console.log(embedding.length); // 1536

// 批量向量化（离线建库）
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: [
    '向量数据库用于存储和检索高维向量',
    'RAG 是检索增强生成的缩写',
    'Embedding 将文本映射到向量空间',
  ],
});

// 语义相似度检索
const query = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: '如何做语义搜索？',
});

const similarities = embeddings.map((e, i) => ({
  index: i,
  score: cosineSimilarity(query.embedding, e),
}));
similarities.sort((a, b) => b.score - a.score);
console.log('最相关:', similarities[0]); // { index: 2, score: 0.89 }
```

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

### 代码示例

```ts
import { rerank } from 'ai';
import { cohere } from '@ai-sdk/cohere';

// 先用 embedding 召回 topK 候选，再用 rerank 精排
const candidates = [
  '向量数据库是专门存储和检索高维向量的数据库系统',
  'SQL 数据库使用结构化查询语言进行数据操作',
  '向量检索通过计算余弦相似度来找到最相关的文档',
  '关系型数据库通过表和外键来组织数据',
  '语义搜索利用向量表示来理解查询意图',
];

const { results } = await rerank({
  model: cohere.reranker('rerank-v3.5'),
  query: '什么是向量数据库？',
  documents: candidates,
  topN: 3, // 只取最相关的 3 条
});

results.forEach(({ document, relevanceScore }) => {
  console.log(`[${relevanceScore.toFixed(3)}] ${document}`);
});
// [0.952] 向量数据库是专门存储和检索高维向量的数据库系统
// [0.871] 向量检索通过计算余弦相似度来找到最相关的文档
// [0.743] 语义搜索利用向量表示来理解查询意图
```

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

### 代码示例

```ts
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: '一只戴着眼镜在写代码的猫，赛博朋克风格',
  size: '1024x1024',
  providerOptions: {
    openai: { quality: 'hd', style: 'vivid' },
  },
});

// image.base64 — base64 编码的图片数据
// image.uint8Array — 二进制数据，可直接写入文件
import { writeFile } from 'fs/promises';
await writeFile('output.png', image.uint8Array);

// 记录生成参数用于复现
const generationLog = {
  prompt: '一只戴着眼镜在写代码的猫，赛博朋克风格',
  model: 'dall-e-3',
  size: '1024x1024',
  timestamp: Date.now(),
};
console.log('生成记录:', generationLog);
```

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
- 对外提供”生成中/已完成/失败原因”的用户态反馈。

### 代码示例

```ts
import { experimental_generateVideo as generateVideo } from 'ai';
import { luma } from '@ai-sdk/luma';
import { writeFile } from 'fs/promises';

// 视频生成是异步长任务，SDK 内部会轮询直到完成
const { video } = await generateVideo({
  model: luma.video('ray-2'),
  prompt: '一只猫在键盘上打字，电影质感',
  providerOptions: {
    luma: { aspectRatio: '16:9' },
  },
});

await writeFile('output.mp4', video.uint8Array);

// 生产环境建议加超时与错误处理
async function generateVideoSafe(prompt: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 分钟超时

  try {
    const { video } = await generateVideo({
      model: luma.video('ray-2'),
      prompt,
      abortSignal: controller.signal,
    });
    return { status: 'completed' as const, video };
  } catch (error) {
    return { status: 'failed' as const, reason: String(error) };
  } finally {
    clearTimeout(timeout);
  }
}
```

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

### 代码示例

```ts
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFile } from 'fs/promises';

// 文本转语音（TTS）
const { speech } = await generateSpeech({
  model: openai.speech('tts-1'),
  text: '欢迎使用 AI SDK，这是一段语音合成示例。',
  voice: 'alloy',          // 音色选择
  providerOptions: {
    openai: {
      speed: 1.0,           // 语速控制
      response_format: 'mp3', // 格式：mp3 体积小，wav 音质高
    },
  },
});

await writeFile('speech.mp3', speech.uint8Array);

// 流式语音输出（低延迟场景）
import { experimental_streamSpeech as streamSpeech } from 'ai';

const result = streamSpeech({
  model: openai.speech('tts-1'),
  text: '这是一段流式语音，适合实时播放场景。',
  voice: 'nova',
});

const chunks: Buffer[] = [];
for await (const chunk of result.audioStream) {
  chunks.push(Buffer.from(chunk));
}
await writeFile('stream-speech.mp3', Buffer.concat(chunks));
```

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

### 代码示例

```ts
import { experimental_transcribe as transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFile } from 'fs/promises';

// 语音转文本（ASR）
const audioBuffer = await readFile('meeting-recording.mp3');

const { text, segments } = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: audioBuffer,
  providerOptions: {
    openai: {
      language: 'zh',              // 指定语言提升准确率
      response_format: 'verbose_json', // 获取分段时间戳
      prompt: 'AI SDK, RAG, LLM',  // 术语词表提示
    },
  },
});

console.log('转写结果:', text);

// 分段信息（含时间戳），可用于字幕或人工复核
segments?.forEach(seg => {
  console.log(`[${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s] ${seg.text}`);
});
```

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

### 代码示例

```ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 开启 telemetry 后，可在 Vercel AI Playground 或 OpenTelemetry 后端查看调用详情
const { text, usage, finishReason, response } = await generateText({
  model: openai('gpt-4o'),
  prompt: '什么是依赖注入？',
  experimental_telemetry: { isEnabled: true, functionId: 'debug-demo' },
});

// 开发环境手动打印调试信息
console.log('[DEBUG] finishReason:', finishReason);
console.log('[DEBUG] usage:', usage);
console.log('[DEBUG] response headers:', response.headers);
console.log('[DEBUG] model id:', response.modelId);

// 排查流式中断：监听每个事件
import { streamText } from 'ai';

const stream = streamText({
  model: openai('gpt-4o'),
  prompt: '列举设计模式',
  onChunk({ chunk }) {
    console.log('[CHUNK]', chunk.type, chunk.type === 'text-delta' ? chunk.textDelta.slice(0, 20) : '');
  },
  onFinish({ finishReason, usage }) {
    console.log('[FINISH]', finishReason, usage);
  },
  onError({ error }) {
    console.error('[ERROR]', error);
  },
});

for await (const _ of stream.textStream) { /* consume */ }
```

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

### 代码示例

```tsx
// --- 后端 (Next.js Route Handler) ---
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: '你是一位友好的技术助手',
    messages,
  });

  return result.toDataStreamResponse();
}

// --- 前端 (React 组件) ---
// app/page.tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.parts.map((part, i) =>
            part.type === 'text' ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} placeholder="输入消息..." />
        <button type="submit" disabled={status === 'streaming'}>发送</button>
      </form>
    </div>
  );
}
```

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
- 为消息项增加”复制、重试、继续生成”等操作。

### 代码示例

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chatbot() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    reload,  // 重试最后一条
    stop,    // 中断生成
    setMessages,
  } = useChat({
    api: '/api/chat',
    initialMessages: [],       // 可从持久化恢复
    onFinish(message) {
      console.log('回答完成:', message.id);
    },
    onError(error) {
      console.error('请求失败:', error);
    },
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role === 'user' ? '你' : 'AI'}:</strong>
          {m.parts.map((part, i) =>
            part.type === 'text' ? <span key={i}>{part.text}</span> : null
          )}
          {m.role === 'assistant' && (
            <button onClick={() => reload()}>重试</button>
          )}
        </div>
      ))}

      {status === 'streaming' && (
        <button onClick={() => stop()}>停止生成</button>
      )}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder=”输入消息...”
          disabled={status === 'streaming'}
        />
        <button type=”submit” disabled={status === 'streaming'}>发送</button>
      </form>
    </div>
  );
}
```

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

### 代码示例

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function ChatWithTools() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    maxSteps: 5, // 允许前端自动继续工具调用轮次
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role === 'user' ? '你' : 'AI'}:</strong>
          {m.parts.map((part, i) => {
            // 渲染文本
            if (part.type === 'text') return <span key={i}>{part.text}</span>;
            // 渲染工具调用状态
            if (part.type === 'tool-invocation') {
              const { toolInvocation } = part;
              if (toolInvocation.state === 'call') {
                return <div key={i}>🔄 调用工具: {toolInvocation.toolName}...</div>;
              }
              if (toolInvocation.state === 'result') {
                return (
                  <div key={i}>
                    ✅ {toolInvocation.toolName} 结果:
                    <pre>{JSON.stringify(toolInvocation.result, null, 2)}</pre>
                  </div>
                );
              }
            }
            return null;
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}

// --- 后端 ---
// app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      getWeather: tool({
        description: '获取城市天气',
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ city, temp: 25, condition: '晴' }),
      }),
    },
    maxSteps: 5,
  });
  return result.toDataStreamResponse();
}
```

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

### 代码示例

```tsx
// --- 后端：持久化消息 ---
// app/api/chat/route.ts
import { streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';

// 模拟数据库存储
const chatStore = new Map<string, UIMessage[]>();

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();

  // 保存用户消息
  const existing = chatStore.get(chatId) ?? [];
  chatStore.set(chatId, [...existing, messages.at(-1)!]);

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    onFinish({ response }) {
      // 生成完成后保存 assistant 消息（含 metadata、工具信息）
      const stored = chatStore.get(chatId) ?? [];
      chatStore.set(chatId, [...stored, ...response.messages]);
    },
  });

  return result.toDataStreamResponse();
}

// --- 前端：从持久化恢复会话 ---
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat({ chatId }: { chatId: string }) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    body: { chatId },
    initialMessages: [], // 实际从 API 加载历史消息
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.parts.filter(p => p.type === 'text').map(p => p.text).join('')}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

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

### 代码示例

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function ResumableChat({ chatId }: { chatId: string }) {
  const { messages, input, handleInputChange, handleSubmit, status, experimental_resume } = useChat({
    api: '/api/chat',
    body: { chatId },
    // 从持久化加载历史消息（含未完成的流式消息）
    initialMessages: [], // 实际从 API 加载
  });

  // 页面加载时检测是否有未完成的流，自动恢复
  // experimental_resume() 会向服务端请求从断点继续
  // 服务端需要缓存流上下文（如 Redis）以支持恢复

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.role}: {m.parts.filter(p => p.type === 'text').map(p => p.text).join('')}
        </div>
      ))}

      {/* 检测到中断的流时显示恢复按钮 */}
      {status === 'ready' && messages.at(-1)?.role === 'assistant' && (
        <button onClick={() => experimental_resume()}>恢复生成</button>
      )}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}

// --- 后端需要支持流恢复 ---
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 缓存活跃流的上下文，支持断点续传
const streamCache = new Map<string, any>();

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    onFinish() {
      streamCache.delete(chatId); // 完成后清理缓存
    },
  });

  return result.toDataStreamResponse();
}
```

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

### 代码示例

```tsx
// --- 后端 ---
// app/api/completion/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    prompt: `续写以下内容，保持风格一致，不超过 200 字：\n\n${prompt}`,
  });

  return result.toDataStreamResponse();
}

// --- 前端 ---
'use client';
import { useCompletion } from '@ai-sdk/react';

export default function WritingAssistant() {
  const {
    completion,   // 模型生成的补全文本
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
  } = useCompletion({
    api: '/api/completion',
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="输入开头，AI 帮你续写..."
          rows={4}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '生成中...' : '续写'}
        </button>
        {isLoading && <button onClick={stop}>停止</button>}
      </form>

      {completion && (
        <div>
          <h3>续写结果：</h3>
          <p>{completion}</p>
        </div>
      )}
    </div>
  );
}
```

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

### 代码示例

```tsx
// --- 后端 ---
// app/api/object/route.ts
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const taskSchema = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    estimatedHours: z.number(),
  })),
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = streamObject({
    model: openai('gpt-4o'),
    schema: taskSchema,
    prompt: `将以下需求拆解为任务列表：${prompt}`,
  });

  return result.toTextStreamResponse();
}

// --- 前端 ---
'use client';
import { useObject } from '@ai-sdk/react';
import { z } from 'zod';

const taskSchema = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    estimatedHours: z.number(),
  })),
});

export default function TaskGenerator() {
  const { object, submit, isLoading, error } = useObject({
    api: '/api/object',
    schema: taskSchema,
  });

  return (
    <div>
      <button onClick={() => submit('搭建一个用户认证系统')} disabled={isLoading}>
        生成任务
      </button>

      {error && <div>生成失败: {error.message}</div>}

      {/* object 是流式填充的部分对象，字段逐步出现 */}
      {object?.tasks?.map((task, i) => (
        <div key={i}>
          <strong>[{task?.priority}]</strong> {task?.title}
          {task?.estimatedHours && <span> — 预估 {task.estimatedHours}h</span>}
        </div>
      ))}
    </div>
  );
}
```

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

### 代码示例

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

// 根据工具名称渲染不同的 UI 组件
function ToolResult({ name, result }: { name: string; result: any }) {
  switch (name) {
    case 'showWeatherCard':
      return (
        <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8 }}>
          <h4>🌤 {result.city} 天气</h4>
          <p>{result.temp}°C · {result.condition}</p>
        </div>
      );
    case 'showConfirmAction':
      return (
        <div style={{ border: '1px solid orange', padding: 12, borderRadius: 8 }}>
          <p>⚠️ {result.message}</p>
          <button onClick={() => console.log('用户确认')}>确认执行</button>
          <button onClick={() => console.log('用户取消')}>取消</button>
        </div>
      );
    default:
      return <pre>{JSON.stringify(result, null, 2)}</pre>;
  }
}

export default function GenerativeUI() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    maxSteps: 5,
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.parts.map((part, i) => {
            if (part.type === 'text') return <p key={i}>{part.text}</p>;
            if (part.type === 'tool-invocation' && part.toolInvocation.state === 'result') {
              return (
                <ToolResult
                  key={i}
                  name={part.toolInvocation.toolName}
                  result={part.toolInvocation.result}
                />
              );
            }
            return null;
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

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

### 代码示例

```tsx
// --- 后端：在流中附加 metadata ---
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const start = Date.now();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    onFinish({ usage }) {
      // metadata 可在 onFinish 中收集，通过 data stream 推送给前端
      console.log('metadata:', {
        model: 'gpt-4o',
        latencyMs: Date.now() - start,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
      });
    },
  });

  return result.toDataStreamResponse();
}

// --- 前端：消费 metadata ---
'use client';
import { useChat } from '@ai-sdk/react';

// 声明 metadata 类型
declare module '@ai-sdk/react' {
  interface ChatMessageMetadata {
    model?: string;
    latencyMs?: number;
    tokens?: number;
  }
}

export default function ChatWithMeta() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <p>{m.parts.filter(p => p.type === 'text').map(p => p.text).join('')}</p>
          {/* 展示 metadata：模型、耗时、token */}
          {m.metadata && (
            <small style={{ color: '#888' }}>
              {m.metadata.model} · {m.metadata.latencyMs}ms · {m.metadata.tokens} tokens
            </small>
          )}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

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

### 代码示例

```tsx
'use client';
import { useChat, DefaultChatTransport } from '@ai-sdk/react';

// 自定义 Transport：注入鉴权、租户标识、超时控制
class AuthenticatedTransport extends DefaultChatTransport {
  constructor(private token: string, private tenantId: string) {
    super({ api: '/api/chat' });
  }

  // 覆写 headers 注入认证信息
  get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'X-Tenant-Id': this.tenantId,
    };
  }
}

// 指向非默认后端的 Transport（如独立 Express 服务）
const externalTransport = new DefaultChatTransport({
  api: 'http://localhost:8080/api/agents/coach/chat',
});

export default function Chat() {
  const transport = new AuthenticatedTransport('my-jwt-token', 'tenant-abc');

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    transport, // 替换默认传输层
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.parts.filter(p => p.type === 'text').map(p => p.text).join('')}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

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

### 代码示例

```ts
// --- Data Stream Protocol（推荐）---
// 后端使用 toDataStreamResponse() 自动输出符合协议的流
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });

  // Data Stream Protocol：自动编码文本、工具调用、数据事件
  // 格式示例：
  //   0:"Hello"        — 文本增量
  //   9:{"toolCallId":"call-1","toolName":"getWeather",...}  — 工具调用
  //   d:{"finishReason":"stop","usage":{...}}  — 完成事件
  return result.toDataStreamResponse();
}

// --- 简单文本流协议（兼容非 SDK 前端）---
export async function POST_simple(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });

  // 纯文本流：只输出文本 chunk，无结构化事件
  // 适合对接不使用 AI SDK 的前端或 curl 调试
  return result.toTextStreamResponse();
}

// 前端 useChat 默认消费 Data Stream Protocol
// 如果后端用 toTextStreamResponse()，前端需要配置：
// useChat({ streamProtocol: 'text' })
```

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

### 代码示例

```ts
import { UIMessageStreamPart, processUIMessageStream } from 'ai';

// 手动读取 UIMessage Stream（不依赖 useChat 的场景）
async function readChatStream(response: Response) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let assistantText = '';
  const toolCalls: any[] = [];

  // 使用 processUIMessageStream 解析流事件
  await processUIMessageStream({
    stream: response.body!,
    onTextPart(text) {
      assistantText += text;
      console.log('[文本增量]', text);
    },
    onToolCallPart(toolCall) {
      toolCalls.push(toolCall);
      console.log('[工具调用]', toolCall.toolName, toolCall.args);
    },
    onToolResultPart(toolResult) {
      console.log('[工具结果]', toolResult.toolName, toolResult.result);
    },
    onDataPart(data) {
      console.log('[自定义数据]', data);
    },
    onErrorPart(error) {
      console.error('[流错误]', error);
    },
    onFinishMessagePart(finish) {
      console.log('[完成]', finish.finishReason, finish.usage);
    },
  });

  return { text: assistantText, toolCalls };
}

// 使用示例
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
});

const result = await readChatStream(response);
console.log('最终文本:', result.text);
```

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

### 代码示例

```ts
// --- 后端：在流中推送自定义数据 ---
// app/api/chat/route.ts
import { streamText, createDataStreamResponse } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  return createDataStreamResponse({
    execute(dataStream) {
      // 推送自定义进度事件
      dataStream.writeMessageAnnotation({ type: 'status', value: '正在检索相关文档...' });

      const result = streamText({
        model: openai('gpt-4o'),
        messages,
        onFinish({ usage }) {
          // 生成完成后推送 token 统计
          dataStream.writeMessageAnnotation({
            type: 'usage',
            value: { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens },
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}

// --- 前端：消费自定义数据 ---
'use client';
import { useChat } from '@ai-sdk/react';

export default function ChatWithProgress() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <p>{m.parts.filter(p => p.type === 'text').map(p => p.text).join('')}</p>

          {/* 读取 message annotations 中的自定义数据 */}
          {m.annotations?.map((ann: any, i: number) => {
            if (ann.type === 'status') return <small key={i}>📡 {ann.value}</small>;
            if (ann.type === 'usage') return (
              <small key={i}>
                Tokens: {ann.value.promptTokens} + {ann.value.completionTokens}
              </small>
            );
            return null;
          })}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

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

### 代码示例

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function ChatWithErrorHandling() {
  const { messages, input, handleInputChange, handleSubmit, error, reload, status } = useChat({
    api: '/api/chat',
    onError(error) {
      // 统一上报错误到日志系统
      console.error('[Chat Error]', {
        message: error.message,
        timestamp: Date.now(),
      });
    },
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.parts.filter(p => p.type === 'text').map((p, i) => (
            <span key={i}>{p.text}</span>
          ))}
        </div>
      ))}

      {/* 流式中途失败：已收到的内容保留，显示错误 + 重试 */}
      {error && (
        <div style={{ color: 'red', padding: 8, border: '1px solid red', borderRadius: 4 }}>
          <p>出错了: {error.message}</p>
          <button onClick={() => reload()}>重试</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={status === 'streaming'} />
        <button type="submit" disabled={status === 'streaming'}>发送</button>
      </form>
    </div>
  );
}

// --- 后端：返回用户友好的错误信息 ---
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const result = streamText({ model: openai('gpt-4o'), messages });
    return result.toDataStreamResponse();
  } catch (error: any) {
    // 区分错误类型，返回不同 HTTP 状态码
    if (error.statusCode === 429) {
      return new Response('请求过于频繁，请稍后再试', { status: 429 });
    }
    if (error.statusCode >= 500) {
      return new Response('AI 服务暂时不可用，请稍后重试', { status: 503 });
    }
    return new Response('请求处理失败', { status: 500 });
  }
}
```

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
