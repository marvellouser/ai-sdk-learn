import { spawn } from 'node:child_process';

import type {
  VideoAnalysisMetadata,
  VideoQualityOption,
  VideoSubtitleTrack,
} from './video-analysis.js';

const FFPROBE_TIMEOUT_MS = 20_000;
const FFMPEG_SUBTITLE_TIMEOUT_MS = 30_000;
const MAX_SUBTITLE_CHARS = 12_000;

type FfprobeStream = {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  bit_rate?: string;
  tags?: Record<string, string>;
};

type FfprobeFormat = {
  duration?: string;
  bit_rate?: string;
  tags?: Record<string, string>;
};

type FfprobeOutput = {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
};

function runCommand(
  command: string,
  args: string[],
  options: { timeoutMs: number; maxBytes?: number },
): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    let stderr = '';
    let stdoutSize = 0;
    let settled = false;

    const finish = (error?: Error, payload?: { stdout: Buffer; stderr: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else if (payload) resolve(payload);
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`${command} 执行超时`));
    }, options.timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutSize += chunk.byteLength;
      if (options.maxBytes && stdoutSize > options.maxBytes) {
        child.kill('SIGKILL');
        finish(new Error(`${command} 输出过大，已停止读取`));
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', err => {
      if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        finish(new Error(`未找到 ${command} 命令，请确认服务器已安装 ffmpeg。`));
      } else {
        finish(err instanceof Error ? err : new Error(String(err)));
      }
    });

    child.on('close', code => {
      if (code === 0) {
        finish(undefined, { stdout: Buffer.concat(stdoutChunks), stderr });
      } else {
        finish(new Error(`${command} 退出码 ${code}: ${stderr.trim() || '未知错误'}`));
      }
    });
  });
}

function parseDurationSeconds(value?: string): number | undefined {
  if (!value) return undefined;
  const seconds = Number.parseFloat(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

function formatDurationLabel(seconds: number | undefined): string | undefined {
  if (seconds === undefined) return undefined;
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseFrameRate(value?: string): number | undefined {
  if (!value) return undefined;
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map(part => Number.parseFloat(part));
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
      return Math.round((numerator / denominator) * 100) / 100;
    }
    return undefined;
  }
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : undefined;
}

function buildQuality(stream: FfprobeStream): VideoQualityOption | null {
  if (stream.codec_type !== 'video' || !stream.width || !stream.height) return null;
  const fps = parseFrameRate(stream.r_frame_rate);
  const bitrate = stream.bit_rate ? Number.parseInt(stream.bit_rate, 10) : undefined;
  const label = `${stream.height}p`;
  return {
    label,
    width: stream.width,
    height: stream.height,
    ...(fps !== undefined ? { fps } : {}),
    ...(bitrate !== undefined && Number.isFinite(bitrate) ? { bitrate } : {}),
    ...(stream.codec_name ? { mimeType: `video/${stream.codec_name}` } : {}),
  };
}

function buildSubtitleTrack(stream: FfprobeStream, subtitleIndex: number): VideoSubtitleTrack {
  const tags = stream.tags ?? {};
  const language = tags.language || tags.LANGUAGE;
  const title = tags.title || tags.TITLE || tags.name || tags.NAME;
  const label = title || language || `字幕轨道 ${subtitleIndex + 1}`;
  return {
    label,
    ...(language ? { language } : {}),
    source: 'local-embedded',
  };
}

const VTT_CUE_TIMESTAMP_PATTERN = /\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}\s*-->/;
const VTT_NON_CUE_BLOCK_HEADS = new Set(['WEBVTT', 'NOTE', 'STYLE', 'REGION']);

function isNonCueBlock(firstLine: string): boolean {
  const head = firstLine.split(/\s/, 1)[0] ?? '';
  return VTT_NON_CUE_BLOCK_HEADS.has(head);
}

function parseWebVttToPlainText(raw: string): string {
  const blocks = raw.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const out: string[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (isNonCueBlock(lines[0]!)) continue;

    const timestampIdx = lines.findIndex(line => VTT_CUE_TIMESTAMP_PATTERN.test(line));
    if (timestampIdx < 0) continue;

    for (const line of lines.slice(timestampIdx + 1)) {
      out.push(line.replace(/<[^>]+>/g, ''));
    }
  }

  return out.join('\n').replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').trim();
}

async function probeVideo(filePath: string): Promise<FfprobeOutput> {
  const { stdout } = await runCommand(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { timeoutMs: FFPROBE_TIMEOUT_MS, maxBytes: 1_000_000 },
  );
  try {
    return JSON.parse(stdout.toString('utf8')) as FfprobeOutput;
  } catch {
    throw new Error('无法解析 ffprobe 输出。');
  }
}

async function extractEmbeddedSubtitle(filePath: string, subtitleStreamIndex: number): Promise<string> {
  const { stdout } = await runCommand(
    'ffmpeg',
    ['-v', 'error', '-i', filePath, '-map', `0:${subtitleStreamIndex}`, '-f', 'webvtt', '-'],
    { timeoutMs: FFMPEG_SUBTITLE_TIMEOUT_MS, maxBytes: 1_500_000 },
  );
  return parseWebVttToPlainText(stdout.toString('utf8'));
}

function truncate(text: string, limit: number): { text: string; truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false };
  return { text: text.slice(0, limit), truncated: true };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type LocalVideoInput = {
  filePath: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
};

export async function analyzeLocalVideoFile(input: LocalVideoInput): Promise<VideoAnalysisMetadata> {
  const probe = await probeVideo(input.filePath);
  const streams = probe.streams ?? [];
  const formatTags = probe.format?.tags ?? {};

  const durationSeconds =
    parseDurationSeconds(probe.format?.duration) ??
    parseDurationSeconds(streams.find(stream => stream.codec_type === 'video')?.tags?.DURATION);

  const qualities: VideoQualityOption[] = streams
    .map(buildQuality)
    .filter((quality): quality is VideoQualityOption => quality !== null);

  const subtitleStreams = streams.filter(
    (stream): stream is FfprobeStream & { index: number } =>
      stream.codec_type === 'subtitle' && typeof stream.index === 'number',
  );
  const subtitles: VideoSubtitleTrack[] = subtitleStreams.map((stream, index) => buildSubtitleTrack(stream, index));

  const warnings: string[] = [];
  let transcriptText: string | undefined;
  let transcriptSource: string | undefined;

  if (subtitleStreams.length === 0) {
    warnings.push('上传视频中没有发现内嵌字幕轨道，AI 分析将只能基于文件元信息进行。');
  } else {
    let firstError: string | undefined;
    for (let i = 0; i < subtitleStreams.length; i += 1) {
      const stream = subtitleStreams[i]!;
      try {
        const text = await extractEmbeddedSubtitle(input.filePath, stream.index);
        if (text) {
          const { text: clipped, truncated } = truncate(text, MAX_SUBTITLE_CHARS);
          transcriptText = clipped;
          transcriptSource = subtitles[i]?.label ?? `字幕轨道 ${i + 1}`;
          if (truncated) {
            warnings.push(`字幕内容较长，已截断为前 ${MAX_SUBTITLE_CHARS} 个字符。`);
          }
          break;
        }
      } catch (error) {
        firstError = error instanceof Error ? error.message : String(error);
      }
    }
    if (!transcriptText) {
      warnings.push(
        firstError
          ? `读取内嵌字幕失败：${firstError}`
          : '已发现内嵌字幕轨道，但解析后内容为空。',
      );
    }
  }

  const description = [
    `本地上传文件：${input.originalName}`,
    `文件大小：${formatBytes(input.sizeBytes)}`,
    input.mimeType ? `MIME：${input.mimeType}` : null,
  ]
    .filter(Boolean)
    .join('；');

  const durationLabel = formatDurationLabel(durationSeconds);

  return {
    source: 'local',
    originalUrl: `upload://${encodeURIComponent(input.originalName)}`,
    finalUrl: `upload://${encodeURIComponent(input.originalName)}`,
    title: formatTags.title || input.originalName,
    description,
    ...(formatTags.artist ? { author: formatTags.artist } : {}),
    ...(durationLabel ? { duration: durationLabel } : {}),
    qualities,
    subtitles,
    ...(transcriptText ? { transcriptText } : {}),
    ...(transcriptSource ? { transcriptSource } : {}),
    warnings,
  };
}
