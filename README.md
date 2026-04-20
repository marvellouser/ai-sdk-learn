# AI SDK Learn

一个从零开始的 `Next + Express` AI SDK 学习项目。

## 目录

- `web/`: Next.js 前端，负责课程页面和双 Agent 演示
- `server/`: Express + AI SDK 后端，负责 lesson 接口、工具调用和 Agent 流式响应
- `docs/`: 中文课程讲义

## 快速开始

1. 复制 `.env.example` 为根目录 `.env`
2. 配置模型连接参数（每个模型都通过 OpenAI 兼容格式接入）：
- `QWEN_API_KEY` + `QWEN_BASE_URL` + `QWEN_MODEL_NAME`
- `DEEPSEEK_API_KEY` + `DEEPSEEK_BASE_URL` + `DEEPSEEK_MODEL_NAME`
3. 安装依赖:

```bash
pnpm install
```

4. 启动服务:

```bash
pnpm dev
```

5. 打开:

- 前端: `http://localhost:3000`
- 后端健康检查: `http://localhost:8080/api/health`

## 学习路线

1. 先看 `docs/01-provider-and-first-call.md`
2. 跟着课程页依次体验 `lesson-1` 到 `lesson-8`
3. 再进入 `学习教练 Agent` 和 `需求分析 Agent` 综合 demo

## 模型接入方式

- 主线和扩展都使用 OpenAI 兼容接入方式
- 通过 `key + baseUrl + modelName` 配置 Qwen 与 DeepSeek
- 全程不使用 AI Gateway
