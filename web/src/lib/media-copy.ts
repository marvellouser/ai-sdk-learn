export type StylePreset = 'story' | 'professional' | 'empathetic' | 'casual';

export type MediaCopyCards = {
  analysis: {
    audienceInsights: string[];
    contentStrategy: string[];
  };
  xiaohongshu: {
    titleCandidates: string[];
    body: string;
    tags: string[];
    cta: string;
  };
  wechat: {
    titleCandidates: string[];
    intro: string;
    body: string;
    outro: string;
  };
};

export type MediaCopyHistoryListItem = {
  id: string;
  createdAt: string;
  stylePreset: StylePreset;
  customStyle: string;
  inputPreview: string;
  outputSummary: string;
};

export type MediaCopyHistoryListResponse = {
  profileId: string;
  items: MediaCopyHistoryListItem[];
};

export type MediaCopyHistoryDetail = {
  id: string;
  createdAt: string;
  stylePreset: StylePreset;
  customStyle: string;
  inputText: string;
  outputMarkdown: string;
  outputSummary: string;
};

export const PROFILE_STORAGE_KEY = 'media-copy-profile-id';

export const stylePresetOptions: Array<{ value: StylePreset; label: string; description: string }> = [
  {
    value: 'story',
    label: '故事叙述',
    description: '更强调故事线、代入感和经历分享。',
  },
  {
    value: 'professional',
    label: '专业干货',
    description: '更强调方法、结构和落地价值。',
  },
  {
    value: 'empathetic',
    label: '共情治愈',
    description: '更强调情绪理解、鼓励和温度。',
  },
  {
    value: 'casual',
    label: '轻松口语',
    description: '更强调自然表达和日常语气。',
  },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSection(markdown: string, heading: string): string {
  const pattern = new RegExp(`##\\s*${escapeRegex(heading)}\\s*([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  return markdown.match(pattern)?.[1]?.trim() ?? '';
}

function extractSubSection(section: string, heading: string): string {
  const pattern = new RegExp(`###\\s*${escapeRegex(heading)}\\s*([\\s\\S]*?)(?=\\n###\\s|$)`, 'i');
  return section.match(pattern)?.[1]?.trim() ?? '';
}

function parseList(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^(-|\*|\d+\.)\s+/.test(line))
    .map(line => line.replace(/^(-|\*|\d+\.)\s+/, '').trim())
    .filter(Boolean);
}

function cleanupPlainText(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function parseMediaCopyMarkdown(markdown: string): MediaCopyCards {
  const analysisSection = extractSection(markdown, '分析卡');
  const xiaohongshuSection = extractSection(markdown, '小红书卡');
  const wechatSection = extractSection(markdown, '公众号卡');

  return {
    analysis: {
      audienceInsights: parseList(extractSubSection(analysisSection, '受众洞察')),
      contentStrategy: parseList(extractSubSection(analysisSection, '内容策略')),
    },
    xiaohongshu: {
      titleCandidates: parseList(extractSubSection(xiaohongshuSection, '标题候选')),
      body: cleanupPlainText(extractSubSection(xiaohongshuSection, '正文')),
      tags: parseList(extractSubSection(xiaohongshuSection, '推荐标签')),
      cta: cleanupPlainText(extractSubSection(xiaohongshuSection, '互动引导')),
    },
    wechat: {
      titleCandidates: parseList(extractSubSection(wechatSection, '标题候选')),
      intro: cleanupPlainText(extractSubSection(wechatSection, '导语')),
      body: cleanupPlainText(extractSubSection(wechatSection, '正文')),
      outro: cleanupPlainText(extractSubSection(wechatSection, '结尾引导')),
    },
  };
}

export function createProfileId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `profile_${crypto.randomUUID()}`;
    }
  } catch {
    // Fall back to timestamp-based id below.
  }

  return `profile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
