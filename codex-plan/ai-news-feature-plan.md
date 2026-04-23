# AI资讯功能实施计划（可直接执行）

## Summary
- 在现有 `web + server` 项目中新增 AI 资讯模块，包含：首页入口卡片、资讯列表页、文章 AI 总结页、两处邮件发送。
- 资讯时间窗口固定为近 30 天，按当前日期 `2026-04-23` 计算为 `2026-03-24 ~ 2026-04-23`。
- 每源默认 3 条：OpenAI 3 条、Anthropic 3 条、Sam Altman 博客最多 3 条。
- Altman 来源仅使用 `blog.samaltman.com/posts.atom`，不使用 X，不补齐超窗数据。
- 邮件发送使用模型触发 Tool，但邮件正文在页面渲染阶段已确定，发送时不再二次生成正文。

## Key Changes
- 首页新增“获取最新 AI 资讯”功能卡片，接入现有 `featureCards` 导航机制。
- 新增资讯列表页，按来源分组展示双语卡片：
  - 中文标题、英文标题
  - 中文概要、英文概要
  - 发布时间、来源、原文链接
  - `AI总结` 按钮跳转文章总结页
  - 邮箱发送区（输入邮箱后发送当前列表的精美 HTML 邮件）
- 新增文章 AI 总结页：
  - 接收文章 URL 与来源参数
  - 后端抓取并清洗正文
  - 流式渲染详细要点与总结
  - 提供“发送总结邮件”能力（同样基于预构建邮件内容）
- 后端新增资讯聚合服务：
  - OpenAI：官方 RSS
  - Anthropic：官方 News 页面/结构化数据解析
  - Altman：官方 Atom Feed
  - 统一字段模型、时间过滤、去重、排序
- 后端新增邮件发送 Tool：
  - Tool 名：`send_prebuilt_email`
  - SMTP：`smtp.qq.com`
  - Tool 仅发送已构建 `subject/html/text`，不接收模型新生成正文
- 增加安全约束：
  - 文章抓取 URL 白名单：`openai.com`、`anthropic.com`、`blog.samaltman.com`
  - 防止 SSRF 与非预期外链抓取

## API / Interface Additions
- `GET /api/ai-news/feed`
  - 返回 `windowStart/windowEnd/itemsBySource/listEmailDraft/generatedAt`
- `POST /api/ai-news/summary/stream`
  - 入参：`url/source/itemId`
  - 返回：流式 Markdown 总结
- `POST /api/ai-news/email/send`
  - 入参：`toEmail/draft/context`
  - 内部走模型触发 Tool，Tool 使用预构建邮件内容发送
- 新增核心类型：
  - `AiNewsItem`
  - `AiNewsFeedResponse`
  - `AiSummaryRequest`
  - `EmailDraft`

## Suggested Implementation Steps
1. 后端先行：新增 `ai-news` 路由、schema、聚合抓取逻辑、文章正文提取与流式总结。
2. 邮件能力：新增 SMTP 配置与 `send_prebuilt_email` Tool，完成 `/api/ai-news/email/send`。
3. 前端页面：新增资讯列表页与总结页，完成双语卡片渲染和两处邮箱发送交互。
4. 首页接入：在 `featureCards` 增加新入口卡片并补前端测试。
5. 测试与联调：补服务端/前端单测，完成真实接口与 SMTP 联调验证。

## Test Plan
- 服务端单测：
  - 三源抓取与解析正确
  - 30 天过滤正确
  - 每源 3 条规则正确
  - 双语字段结构满足 schema
  - 邮件发送必须使用预构建内容
  - URL 白名单有效
- 前端单测：
  - 首页新卡片可见且跳转正确
  - 列表页双语卡片渲染正确
  - 总结页流式内容逐步展示正确
  - 两页面邮箱校验与发送状态正确
- 联调验收：
  - 列表页可稳定展示三源资讯
  - 点击 `AI总结` 能流式输出完整要点
  - 两处邮件可通过 QQ SMTP 成功送达

## Assumptions
- 每源条数固定为 3，不提供前端动态切换。
- Altman 严格使用博客源，近 30 天不足 3 条时允许少于 3 条。
- 发送流程固定为“模型触发 Tool + 预构建邮件正文”。
- SMTP 环境变量：
  - `SMTP_HOST=smtp.qq.com`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
