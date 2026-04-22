import { describe, expect, it } from 'vitest';

import { parseMediaCopyMarkdown } from './media-copy';

describe('parseMediaCopyMarkdown', () => {
  it('parses full markdown into card fields', () => {
    const parsed = parseMediaCopyMarkdown(`## 分析卡
### 受众洞察
- 想快速发布内容的人
### 内容策略
- 用真实故事开场

## 小红书卡
### 标题候选
- 从0开始做账号
- 一周完成首发
### 正文
第一段
第二段
### 推荐标签
- #内容运营
- #创作
### 互动引导
你会先写哪个主题？

## 公众号卡
### 标题候选
- 公众号从0到1
### 导语
这是一段导语
### 正文
这是正文
### 结尾引导
欢迎留言交流`);

    expect(parsed.analysis.audienceInsights[0]).toBe('想快速发布内容的人');
    expect(parsed.analysis.contentStrategy[0]).toBe('用真实故事开场');
    expect(parsed.xiaohongshu.titleCandidates).toHaveLength(2);
    expect(parsed.xiaohongshu.tags[0]).toBe('#内容运营');
    expect(parsed.wechat.intro).toContain('导语');
    expect(parsed.wechat.outro).toContain('欢迎留言');
  });

  it('returns safe empty fields for partial markdown', () => {
    const parsed = parseMediaCopyMarkdown('## 小红书卡\n### 标题候选\n- 今天就开写');

    expect(parsed.analysis.audienceInsights).toEqual([]);
    expect(parsed.xiaohongshu.titleCandidates).toEqual(['今天就开写']);
    expect(parsed.wechat.body).toBe('');
  });
});
