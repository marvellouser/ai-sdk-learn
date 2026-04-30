export type FeatureCard = {
  id: string;
  title: string;
  summary: string;
  href: string;
  badge: string;
};

export const featureCards: FeatureCard[] = [
  {
    id: 'ai-sdk-learning',
    title: 'AI SDK学习',
    summary: '章节化学习 AI SDK 能力，覆盖 lesson、流式接口和 Agent 实战。',
    href: '/ai-sdk-learning',
    badge: 'LEARNING PATH',
  },
  {
    id: 'creator-copy',
    title: '自媒体文案生成',
    summary: '输入想法或故事，流式生成小红书和公众号双平台可发布文案，并自动学习你的风格。',
    href: '/creator-copy',
    badge: 'CONTENT STUDIO',
  },
  {
    id: 'ai-news',
    title: '获取最新AI资讯',
    summary: '聚合 OpenAI、Anthropic 与 Sam Altman 博客近30天官方资讯，支持AI流式总结与邮件发送。',
    href: '/ai-news',
    badge: 'AI NEWS',
  },
  {
    id: 'video-analysis',
    title: '视频网站分析',
    summary: '输入 YouTube、bilibili、douyin 等公开视频地址，解析视频信息并流式输出 AI 分析。',
    href: '/video-analysis',
    badge: 'VIDEO ANALYSIS',
  },
  {
    id: 'compound-interest',
    title: '复利计算器',
    summary: '支持固定本金、定期定额投入和目标金额反推，纯前端完成每期复利明细计算。',
    href: '/compound-interest',
    badge: 'FINANCE TOOL',
  },
];
