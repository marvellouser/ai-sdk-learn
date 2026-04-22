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
];
