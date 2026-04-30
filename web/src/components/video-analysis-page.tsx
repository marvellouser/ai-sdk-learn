'use client';

import Link from 'next/link';
import { useState } from 'react';

import { requestJson, requestTextStream } from '../lib/api';
import { supportedVideoSourceLabel } from '../lib/video-analysis-sources';
import {
  formatDateLabel,
  formatQualityLabel,
  formatSubtitleLabel,
  getTranscriptPreview,
  getVideoTitle,
  sourceLabel,
  type VideoAnalysisMetadata,
} from '../lib/video-analysis';

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <dt className="text-xs font-semibold tracking-[0.12em] text-accent-light uppercase">{label}</dt>
      <dd className="mt-1 break-words text-sm leading-6 text-text">{value?.trim() || '未解析'}</dd>
    </div>
  );
}

function VideoMetadataView({ video }: { video: VideoAnalysisMetadata }) {
  return (
    <section className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] md:grid-cols-[320px_1fr] md:p-6">
      <div className="grid content-start gap-3">
        <div className="overflow-hidden rounded-xl border border-border bg-surface-light">
          {video.thumbnailUrl ? (
            <img
              alt={getVideoTitle(video)}
              className="aspect-video w-full object-cover"
              referrerPolicy="no-referrer"
              src={video.thumbnailUrl}
            />
          ) : (
            <div className="grid aspect-video place-items-center px-4 text-center text-sm text-muted">未解析到封面</div>
          )}
        </div>
        <a
          className="inline-flex justify-center rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
          href={video.finalUrl}
          rel="noreferrer"
          target="_blank"
        >
          打开原页面
        </a>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent-light">{sourceLabel(video.source)}</p>
          <h2 className="text-2xl leading-tight font-semibold text-text">{getVideoTitle(video)}</h2>
          {video.description ? <p className="mt-3 leading-7 text-muted">{video.description}</p> : null}
        </div>

        <dl className="grid gap-0 md:grid-cols-2 md:gap-x-5">
          <InfoRow label="作者" value={video.author} />
          <InfoRow label="时长" value={video.duration} />
          <InfoRow label="发布时间" value={formatDateLabel(video.publishedAt)} />
          <InfoRow label="最终地址" value={video.finalUrl} />
        </dl>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-text">清晰度</h3>
            {video.qualities.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {video.qualities.map((quality, index) => (
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent-light" key={`${quality.label}-${index}`}>
                    {formatQualityLabel(quality)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">未解析到公开清晰度信息。</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text">字幕</h3>
            {video.subtitles.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {video.subtitles.map((subtitle, index) => (
                  <span className="rounded-full bg-surface-light px-3 py-1 text-sm text-muted" key={`${subtitle.label}-${index}`}>
                    {formatSubtitleLabel(subtitle)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">未发现公开字幕轨道。</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-light/60 p-4">
          <h3 className="text-sm font-semibold text-text">字幕预览</h3>
          <p className="mt-2 text-sm leading-7 text-muted">{getTranscriptPreview(video)}</p>
          {video.transcriptSource ? <p className="mt-2 text-xs text-accent-light">来源：{video.transcriptSource}</p> : null}
        </div>

        {video.warnings.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">解析提示</h3>
            <ul className="mt-2 grid gap-1 text-sm leading-6 text-amber-900">
              {video.warnings.map(warning => (
                <li key={warning}>- {warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function VideoAnalysisPage() {
  const [urlInput, setUrlInput] = useState('');
  const [video, setVideo] = useState<VideoAnalysisMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiText, setAiText] = useState('');

  async function handleAnalyze() {
    const url = urlInput.trim();
    if (!isValidUrl(url)) {
      setMetadataError('请输入有效的视频页面地址。');
      setVideo(null);
      setAiText('');
      return;
    }

    try {
      setMetadataLoading(true);
      setMetadataError('');
      setAiError('');
      setAiText('');
      const payload = await requestJson<VideoAnalysisMetadata>('/api/video-analysis/metadata', {
        method: 'POST',
        body: {
          url,
        },
      });
      setVideo(payload);
    } catch (error) {
      setVideo(null);
      setMetadataError(error instanceof Error ? error.message : '视频解析失败');
    } finally {
      setMetadataLoading(false);
    }
  }

  async function handleAiAnalyze() {
    if (!video) {
      return;
    }

    try {
      setAiLoading(true);
      setAiError('');
      setAiText('');

      await requestTextStream(
        '/api/video-analysis/ai/stream',
        {
          method: 'POST',
          body: {
            video,
          },
        },
        collected => setAiText(collected),
      );
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 分析失败');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6 md:py-12">
      <section className="rounded-3xl border border-border bg-surface p-7 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-accent-light">VIDEO ANALYSIS</p>
            <h1 className="text-balance text-4xl leading-tight font-semibold text-text md:text-5xl">视频网站分析</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
              输入 {supportedVideoSourceLabel()} 等公开视频页面地址，解析页面可公开获取的视频信息，并交给 AI 流式分析。
            </p>
          </div>
          <Link
            className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2.5 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
            href="/"
          >
            返回功能入口
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] md:p-6">
        <form
          className="grid gap-3 md:grid-cols-[1fr_auto]"
          onSubmit={event => {
            event.preventDefault();
            void handleAnalyze();
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-text">视频页面地址</span>
            <input
              className="min-w-0 rounded-xl border border-border bg-surface-light px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
              onChange={event => setUrlInput(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
              value={urlInput}
            />
          </label>
          <button
            className="self-end rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!urlInput.trim() || metadataLoading}
            type="submit"
          >
            {metadataLoading ? '分析中...' : '分析'}
          </button>
        </form>
        {metadataError ? <p className="mt-3 text-sm text-error">{metadataError}</p> : null}
      </section>

      {video ? <VideoMetadataView video={video} /> : null}

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">AI 分析视频</p>
            <p className="mt-1 text-sm text-muted">基于已解析的视频元信息和公开字幕生成分析结果。</p>
          </div>
          <button
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!video || aiLoading}
            onClick={() => void handleAiAnalyze()}
            type="button"
          >
            {aiLoading ? 'AI分析中...' : 'AI分析视频'}
          </button>
        </div>

        {aiError ? <p className="mt-3 text-sm text-error">{aiError}</p> : null}
        {aiLoading && !aiText ? <p className="mt-4 text-sm text-muted">AI 正在分析中...</p> : null}
        {aiText ? (
          <div className="mt-4 rounded-xl border border-border bg-surface-light/60 p-4">
            <pre className="text-sm leading-7 text-text">{aiText}</pre>
          </div>
        ) : null}
      </section>
    </main>
  );
}
