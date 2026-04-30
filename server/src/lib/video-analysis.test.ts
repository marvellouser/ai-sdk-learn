import { describe, expect, it } from 'vitest';

import {
  buildVideoAnalysisPrompt,
  describeBlockedVideoResponse,
  describeVideoFetchFailure,
  detectVideoAccessBlock,
  extractJsonAfterMarker,
  getVideoSourceFromUrl,
  isAllowedVideoPageUrl,
  parseVideoPageMetadata,
  type VideoAnalysisMetadata,
} from './video-analysis.js';
import { videoSourceConfigs } from './video-analysis-sources.js';

describe('video-analysis url utilities', () => {
  it('detects supported video hosts', () => {
    expect(getVideoSourceFromUrl('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(getVideoSourceFromUrl('https://youtu.be/abc')).toBe('youtube');
    expect(getVideoSourceFromUrl('https://www.bilibili.com/video/BV1xx')).toBe('bilibili');
    expect(getVideoSourceFromUrl('https://b23.tv/abc')).toBe('bilibili');
    expect(getVideoSourceFromUrl('https://www.douyin.com/video/123')).toBe('douyin');
    expect(getVideoSourceFromUrl('https://example.com/video/1')).toBeNull();
  });

  it('validates page url whitelist and protocols', () => {
    expect(isAllowedVideoPageUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isAllowedVideoPageUrl('http://www.bilibili.com/video/BV1xx')).toBe(true);
    expect(isAllowedVideoPageUrl('ftp://www.youtube.com/watch?v=abc')).toBe(false);
    expect(isAllowedVideoPageUrl('https://example.com/video/1')).toBe(false);
    expect(isAllowedVideoPageUrl('not-a-url')).toBe(false);
  });

  it('keeps supported page hosts in a central whitelist config', () => {
    for (const config of videoSourceConfigs) {
      for (const host of config.pageHosts) {
        expect(getVideoSourceFromUrl(`https://${host}/watch/test`)).toBe(config.id);
      }
    }
  });
});

describe('video-analysis access errors', () => {
  it('describes platform rejection and rate limit responses', () => {
    expect(describeBlockedVideoResponse('https://www.youtube.com/watch?v=abc', 403, 'Forbidden')).toContain(
      'YouTube 拒绝了本次服务器抓取请求（403 Forbidden）',
    );
    expect(describeBlockedVideoResponse('https://www.youtube.com/watch?v=abc', 429, 'Too Many Requests')).toContain(
      'YouTube 对本次服务器抓取进行了限流（429 Too Many Requests）',
    );
  });

  it('describes low-level fetch failures with cause code', () => {
    const error = new TypeError('fetch failed') as TypeError & {
      cause: {
        code: string;
      };
    };
    error.cause = {
      code: 'UND_ERR_CONNECT_TIMEOUT',
    };

    expect(describeVideoFetchFailure('https://www.youtube.com/watch?v=abc', error)).toContain('无法连接到 YouTube：连接超时');
  });

  it('detects login and risk-control pages returned as successful html', () => {
    expect(detectVideoAccessBlock('Before you continue to YouTube', 'https://www.youtube.com/watch?v=abc')).toContain(
      'YouTube 返回了登录、验证码、年龄限制或风控页面',
    );
    expect(detectVideoAccessBlock('正常页面', 'https://www.youtube.com/watch?v=abc')).toBeNull();
  });
});

describe('video-analysis parsing', () => {
  it('extracts balanced json after platform markers', () => {
    const parsed = extractJsonAfterMarker(
      'window.__INITIAL_STATE__={"a":{"b":[{"c":"x;y"}]}};(function(){})();',
      '__INITIAL_STATE__',
    );

    expect(parsed).toEqual({
      a: {
        b: [
          {
            c: 'x;y',
          },
        ],
      },
    });
  });

  it('parses generic Open Graph and JSON-LD metadata', () => {
    const html = `
      <html>
        <head>
          <title>Fallback title</title>
          <meta property="og:title" content="OG 标题">
          <meta property="og:description" content="OG 简介">
          <meta property="og:image" content="https://i.ytimg.com/vi/abc/maxresdefault.jpg">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "VideoObject",
              "name": "JSON-LD 标题",
              "description": "JSON-LD 简介",
              "thumbnailUrl": ["https://img.example.com/a.jpg"],
              "uploadDate": "2026-04-20T00:00:00.000Z",
              "duration": "PT2M10S",
              "author": { "name": "作者A" }
            }
          </script>
        </head>
      </html>
    `;

    const result = parseVideoPageMetadata({
      html,
      originalUrl: 'https://www.youtube.com/watch?v=abc',
      finalUrl: 'https://www.youtube.com/watch?v=abc',
    });

    expect(result.title).toBe('JSON-LD 标题');
    expect(result.description).toBe('JSON-LD 简介');
    expect(result.thumbnailUrl).toBe('https://img.example.com/a.jpg');
    expect(result.author).toBe('作者A');
    expect(result.duration).toBe('PT2M10S');
    expect(result.publishedAt).toBe('2026-04-20T00:00:00.000Z');
  });

  it('parses a minimal YouTube player response', () => {
    const html = `
      <script>
        var ytInitialPlayerResponse = {
          "videoDetails": {
            "title": "YouTube 标题",
            "shortDescription": "YouTube 简介",
            "author": "频道A",
            "lengthSeconds": "125",
            "thumbnail": {
              "thumbnails": [
                { "url": "https://i.ytimg.com/vi/abc/default.jpg", "width": 120 },
                { "url": "https://i.ytimg.com/vi/abc/maxresdefault.jpg", "width": 1280 }
              ]
            }
          },
          "streamingData": {
            "formats": [
              { "qualityLabel": "720p", "width": 1280, "height": 720, "fps": 30, "mimeType": "video/mp4" }
            ]
          },
          "captions": {
            "playerCaptionsTracklistRenderer": {
              "captionTracks": [
                {
                  "baseUrl": "https://www.youtube.com/api/timedtext?v=abc&lang=zh",
                  "languageCode": "zh",
                  "name": { "simpleText": "中文" }
                }
              ]
            }
          }
        };
      </script>
    `;

    const result = parseVideoPageMetadata({
      html,
      originalUrl: 'https://www.youtube.com/watch?v=abc',
      finalUrl: 'https://www.youtube.com/watch?v=abc',
    });

    expect(result.source).toBe('youtube');
    expect(result.title).toBe('YouTube 标题');
    expect(result.thumbnailUrl).toBe('https://i.ytimg.com/vi/abc/maxresdefault.jpg');
    expect(result.author).toBe('频道A');
    expect(result.duration).toBe('2:05');
    expect(result.qualities[0]?.label).toBe('720p');
    expect(result.subtitles[0]?.label).toBe('中文');
    expect(result.subtitles[0]?.language).toBe('zh');
  });

  it('parses a minimal bilibili page state and playinfo', () => {
    const html = `
      <script>
        window.__INITIAL_STATE__ = {
          "videoData": {
            "title": "B站标题",
            "desc": "B站简介",
            "pic": "//i0.hdslb.com/bfs/archive/a.jpg",
            "owner": { "name": "UP主A" },
            "duration": 125,
            "pubdate": 1710000000,
            "subtitle": {
              "list": [
                { "lan": "zh-CN", "lan_doc": "中文字幕", "subtitle_url": "//aisubtitle.hdslb.com/bfs/subtitle/a.json" }
              ]
            }
          }
        };(function(){})();
        window.__playinfo__ = {
          "data": {
            "support_formats": [
              { "new_description": "1080P 高清" }
            ],
            "dash": {
              "video": [
                { "id": 80, "width": 1920, "height": 1080, "frameRate": "60", "bandwidth": 1000, "mimeType": "video/mp4" }
              ]
            }
          }
        };
      </script>
    `;

    const result = parseVideoPageMetadata({
      html,
      originalUrl: 'https://www.bilibili.com/video/BV1xx',
      finalUrl: 'https://www.bilibili.com/video/BV1xx',
    });

    expect(result.source).toBe('bilibili');
    expect(result.title).toBe('B站标题');
    expect(result.description).toBe('B站简介');
    expect(result.thumbnailUrl).toBe('https://i0.hdslb.com/bfs/archive/a.jpg');
    expect(result.author).toBe('UP主A');
    expect(result.duration).toBe('2:05');
    expect(result.publishedAt).toBe('2024-03-09T16:00:00.000Z');
    expect(result.qualities.map(item => item.label)).toContain('1080P 高清');
    expect(result.subtitles[0]?.label).toBe('中文字幕');
  });

  it('parses a minimal douyin hydration payload', () => {
    const payload = {
      page: {
        aweme: {
          desc: '抖音标题',
          create_time: 1710000000,
          author: {
            nickname: '达人A',
          },
          video: {
            duration: 60_000,
            cover: {
              url_list: ['https://p3.douyinpic.com/cover/a.jpeg'],
            },
            bit_rate: [
              {
                gear_name: '720p',
                bit_rate: 900,
                play_addr: {
                  width: 1280,
                  height: 720,
                },
              },
            ],
            subtitle_infos: [
              {
                language: 'zh',
                url: 'https://www.douyin.com/subtitle/a.vtt',
              },
            ],
          },
        },
      },
    };
    const html = `<script id="RENDER_DATA" type="application/json">${encodeURIComponent(JSON.stringify(payload))}</script>`;

    const result = parseVideoPageMetadata({
      html,
      originalUrl: 'https://www.douyin.com/video/123',
      finalUrl: 'https://www.douyin.com/video/123',
    });

    expect(result.source).toBe('douyin');
    expect(result.title).toBe('抖音标题');
    expect(result.thumbnailUrl).toBe('https://p3.douyinpic.com/cover/a.jpeg');
    expect(result.author).toBe('达人A');
    expect(result.duration).toBe('1:00');
    expect(result.qualities[0]?.label).toBe('720p');
    expect(result.subtitles[0]?.language).toBe('zh');
  });

  it('adds warnings when captions or qualities are missing', () => {
    const result = parseVideoPageMetadata({
      html: '<meta property="og:title" content="无字幕视频">',
      originalUrl: 'https://www.youtube.com/watch?v=abc',
      finalUrl: 'https://www.youtube.com/watch?v=abc',
    });

    expect(result.warnings).toContain('未发现公开字幕轨道，AI 分析将只基于页面元信息。');
    expect(result.warnings).toContain('未能从公开页面中解析到清晰度信息。');
  });
});

describe('video-analysis prompt', () => {
  it('builds a bounded prompt with metadata, quality list and transcript', () => {
    const longTranscript = `${'字幕内容'.repeat(3000)}结尾不应出现`;
    const video: VideoAnalysisMetadata = {
      source: 'youtube',
      originalUrl: 'https://www.youtube.com/watch?v=abc',
      finalUrl: 'https://www.youtube.com/watch?v=abc',
      title: '测试视频',
      description: '测试简介',
      author: '作者',
      duration: '2:05',
      qualities: [
        {
          label: '720p',
          width: 1280,
          height: 720,
        },
      ],
      subtitles: [
        {
          label: '中文',
          language: 'zh',
        },
      ],
      transcriptText: longTranscript,
      transcriptSource: '中文',
      warnings: [],
    };

    const prompt = buildVideoAnalysisPrompt(video);

    expect(prompt).toContain('测试视频');
    expect(prompt).toContain('720p');
    expect(prompt).toContain('中文');
    expect(prompt).toContain('字幕内容');
    expect(prompt).not.toContain('结尾不应出现');
    expect(prompt).not.toContain('undefined');
  });

  it('states limited evidence when transcript is absent', () => {
    const prompt = buildVideoAnalysisPrompt({
      source: 'bilibili',
      originalUrl: 'https://www.bilibili.com/video/BV1xx',
      finalUrl: 'https://www.bilibili.com/video/BV1xx',
      title: '无字幕视频',
      qualities: [],
      subtitles: [],
      warnings: ['未发现公开字幕轨道，AI 分析将只基于页面元信息。'],
    });

    expect(prompt).toContain('未读取到公开字幕文本');
    expect(prompt).toContain('分析依据有限');
  });
});
