'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  type ImageOutputFormat,
  type ImageProcessOptions,
  type ProcessImageResponse,
  type ResizeMode,
  type RotateAngle,
  MAX_INPUT_BYTES,
  SUPPORTED_INPUT_ACCEPT,
  compressionRatio,
  estimateImageSize,
  extensionForFormat,
  formatBytes,
  isSupportedImageFile,
  processImage,
  readImageDimensions,
  supportsTargetSize,
} from '../lib/image-processor';

type OriginalImage = {
  file: File;
  url: string;
  width: number;
  height: number;
};

type ResultImage = ProcessImageResponse & {
  url: string;
};

const FORMAT_OPTIONS: { value: ImageOutputFormat; label: string; supportsQuality: boolean }[] = [
  { value: 'webp', label: 'WebP', supportsQuality: true },
  { value: 'jpeg', label: 'JPEG', supportsQuality: true },
  { value: 'avif', label: 'AVIF', supportsQuality: true },
  { value: 'png', label: 'PNG', supportsQuality: false },
];

const ROTATE_OPTIONS: { value: RotateAngle; label: string }[] = [
  { value: '0', label: '不旋转' },
  { value: '90', label: '90°' },
  { value: '180', label: '180°' },
  { value: '270', label: '270°' },
];

const RESIZE_MODE_OPTIONS: { value: ResizeMode; label: string }[] = [
  { value: 'none', label: '不调整尺寸' },
  { value: 'percent', label: '按百分比缩放' },
  { value: 'maxWidth', label: '最大宽度（保持比例）' },
  { value: 'maxHeight', label: '最大高度（保持比例）' },
];

function qualityHint(
  supportsQuality: boolean,
  estimating: boolean,
  estimatedSize: number | null,
): string {
  if (!supportsQuality) return 'PNG 为无损压缩';
  if (estimating) return '估算中…';
  if (estimatedSize !== null) return `预计输出约 ${formatBytes(estimatedSize)}`;
  return ' ';
}

function defaultResizeValue(mode: ResizeMode, sourceWidth?: number, sourceHeight?: number): number {
  if (mode === 'percent') return 80;
  if (mode === 'maxWidth') return Math.min(1920, sourceWidth ?? 1920);
  if (mode === 'maxHeight') return Math.min(1080, sourceHeight ?? 1080);
  return 0;
}

export function ImageProcessorPage() {
  const [original, setOriginal] = useState<OriginalImage | null>(null);
  const [result, setResult] = useState<ResultImage | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [comparePos, setComparePos] = useState(50);

  const [format, setFormat] = useState<ImageOutputFormat>('webp');
  const [quality, setQuality] = useState(80);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('none');
  const [resizeValue, setResizeValue] = useState(80);
  const [rotate, setRotate] = useState<RotateAngle>('0');
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [stripMetadata, setStripMetadata] = useState(false);

  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  const [targetSizeMode, setTargetSizeMode] = useState(false);
  const [targetSizeKB, setTargetSizeKB] = useState(200);

  const targetSizeEnabled = targetSizeMode && supportsTargetSize(format);

  const buildOptions = useCallback(
    (): ImageProcessOptions => ({
      format,
      quality,
      resizeMode,
      resizeValue: resizeMode === 'none' ? undefined : resizeValue,
      rotate,
      flipHorizontal,
      flipVertical,
      stripMetadata,
      targetSizeBytes: targetSizeEnabled ? Math.max(1024, Math.round(targetSizeKB * 1024)) : undefined,
    }),
    [
      format,
      quality,
      resizeMode,
      resizeValue,
      rotate,
      flipHorizontal,
      flipVertical,
      stripMetadata,
      targetSizeEnabled,
      targetSizeKB,
    ],
  );

  useEffect(() => {
    return () => {
      if (original) URL.revokeObjectURL(original.url);
    };
  }, [original]);

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    if (!isSupportedImageFile(file)) {
      setError('仅支持 PNG / JPG / WebP 格式');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError(`文件超过上限（${formatBytes(MAX_INPUT_BYTES)}）`);
      return;
    }

    let dimensions = { width: 0, height: 0 };
    try {
      dimensions = await readImageDimensions(file);
    } catch {
      setError('无法读取图片信息，请确认文件未损坏');
      return;
    }

    setOriginal({
      file,
      url: URL.createObjectURL(file),
      width: dimensions.width,
      height: dimensions.height,
    });
    setResult(null);
    setComparePos(50);
  }, []);

  // Drag & drop
  const onDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile],
  );

  // Debounced size estimation (skipped in target-size mode — binary search is too slow for live preview)
  useEffect(() => {
    if (!original || targetSizeEnabled) {
      setEstimatedSize(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setEstimating(true);
      estimateImageSize(original.file, buildOptions(), controller.signal)
        .then(res => {
          setEstimatedSize(res.size);
          setEstimating(false);
        })
        .catch(err => {
          if (err instanceof Error && err.name === 'AbortError') return;
          setEstimating(false);
        });
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [original, buildOptions, targetSizeEnabled]);

  // Paste
  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            void loadFile(file);
            event.preventDefault();
            break;
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadFile]);

  function onResizeModeChange(mode: ResizeMode) {
    setResizeMode(mode);
    if (mode !== 'none') {
      setResizeValue(defaultResizeValue(mode, original?.width, original?.height));
    }
  }

  async function handleProcess() {
    if (!original || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await processImage(original.file, buildOptions());
      setResult({ ...response, url: URL.createObjectURL(response.blob) });
      setComparePos(50);
    } catch (err) {
      const message = err instanceof Error ? err.message : '处理失败';
      setError(mapErrorMessage(message));
    } finally {
      setPending(false);
    }
  }

  function handleDownload() {
    if (!result || !original) return;
    const baseName = original.file.name.replace(/\.[^.]+$/, '') || 'processed';
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `${baseName}.${extensionForFormat(result.format)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const supportsQuality = FORMAT_OPTIONS.find(opt => opt.value === format)?.supportsQuality ?? true;
  const ratio = result && original ? compressionRatio(original.file.size, result.size) : 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 md:px-6 md:py-16">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-14 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative max-w-3xl">
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-accent-light">IMAGE TOOL</p>
          <h1 className="text-balance text-4xl leading-tight font-semibold text-text md:text-5xl">图片处理器</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            上传 PNG / JPG / WebP 图片，调节输出格式、质量与尺寸，后端使用 sharp 进行处理。支持点击、拖拽与粘贴上传。
          </p>
          <Link
            className="mt-6 inline-flex rounded-full border border-border bg-surface-light px-4 py-2 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
            href="/"
          >
            ← 返回首页
          </Link>
        </div>
      </section>

      <UploadZone
        original={original}
        isDragging={isDragging}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPick={file => void loadFile(file)}
      />

      {error ? (
        <div className="rounded-2xl border border-red-300/60 bg-red-50/70 px-5 py-4 text-sm text-red-700">{error}</div>
      ) : null}

      {original ? (
        <section className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] md:p-6">
          <h2 className="text-lg font-semibold text-text">参数设置</h2>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-sm font-medium text-text">输出格式</span>
              <div className="flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map(opt => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${
                      format === opt.value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-surface-light text-muted hover:border-accent-light hover:text-text'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text">质量 {supportsQuality ? quality : '—'}</span>
                <span className="text-xs text-muted">
                  {qualityHint(supportsQuality, estimating, estimatedSize)}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                disabled={!supportsQuality}
                onChange={e => setQuality(Number(e.target.value))}
                className="w-full accent-accent disabled:opacity-50"
              />
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium text-text">尺寸策略</span>
              <select
                value={resizeMode}
                onChange={e => onResizeModeChange(e.target.value as ResizeMode)}
                className="rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-text"
              >
                {RESIZE_MODE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {resizeMode !== 'none' ? (
              <div className="grid gap-2">
                <span className="text-sm font-medium text-text">
                  {resizeMode === 'percent' ? `缩放比例 ${resizeValue}%` : `${resizeMode === 'maxWidth' ? '最大宽度' : '最大高度'} ${resizeValue}px`}
                </span>
                <input
                  type="range"
                  min={resizeMode === 'percent' ? 1 : 100}
                  max={resizeMode === 'percent' ? 100 : 8000}
                  value={resizeValue}
                  onChange={e => setResizeValue(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            ) : null}
          </div>

          <details className="rounded-xl border border-border bg-surface-light px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-text">高级选项</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-sm font-medium text-text">旋转</span>
                <div className="flex flex-wrap gap-2">
                  {ROTATE_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setRotate(opt.value)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        rotate === opt.value
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border bg-surface text-muted hover:border-accent-light hover:text-text'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium text-text">翻转 / 元数据</span>
                <div className="flex flex-wrap gap-3 text-sm text-text">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={flipHorizontal}
                      onChange={e => setFlipHorizontal(e.target.checked)}
                      className="accent-accent"
                    />
                    水平翻转
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={flipVertical}
                      onChange={e => setFlipVertical(e.target.checked)}
                      className="accent-accent"
                    />
                    垂直翻转
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={stripMetadata}
                      onChange={e => setStripMetadata(e.target.checked)}
                      className="accent-accent"
                    />
                    去除 EXIF
                  </label>
                </div>
              </div>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleProcess()}
              disabled={pending}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? '处理中…' : '开始处理'}
            </button>
            {pending ? (
              <span className="text-sm text-muted">
                {targetSizeEnabled ? '正在二分搜索质量参数（最多 7 次编码），请稍候…' : '大图编码可能需要数秒，请稍候'}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {pending && !result ? <ResultSkeleton /> : null}

      {result && original ? (
        <section className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text">处理结果</h2>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full border border-accent bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent transition hover:bg-accent hover:text-white"
            >
              下载图片
            </button>
          </div>

          <CompareSlider
            originalUrl={original.url}
            resultUrl={result.url}
            width={original.width}
            height={original.height}
            value={comparePos}
            onChange={setComparePos}
          />

          <dl className="grid gap-4 text-sm md:grid-cols-3">
            <Stat label="原始大小" value={formatBytes(original.file.size)} sub={`${original.width} × ${original.height}`} />
            <Stat
              label="输出大小"
              value={formatBytes(result.size)}
              sub={`${result.width} × ${result.height} · ${result.format.toUpperCase()} · 质量 ${result.qualityUsed}`}
            />
            <Stat
              label="压缩率"
              value={`${ratio >= 0 ? '-' : '+'}${Math.abs(ratio)}%`}
              sub={ratio >= 0 ? '体积减少' : '体积增加'}
              highlight={ratio >= 0}
            />
          </dl>
        </section>
      ) : null}
    </main>
  );
}

type UploadZoneProps = {
  original: OriginalImage | null;
  isDragging: boolean;
  onDragOver: (event: React.DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLLabelElement>) => void;
  onPick: (file: File) => void;
};

function UploadZone({ original, isDragging, onDragOver, onDragLeave, onDrop, onPick }: UploadZoneProps) {
  return (
    <label
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`grid cursor-pointer gap-3 rounded-2xl border-2 border-dashed bg-surface p-8 text-center transition ${
        isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent-light'
      }`}
    >
      <input
        type="file"
        accept={SUPPORTED_INPUT_ACCEPT}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
      {original ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={original.url}
            alt={original.file.name}
            className="max-h-64 rounded-lg border border-border object-contain"
          />
          <p className="text-sm text-text">{original.file.name}</p>
          <p className="text-xs text-muted">
            {original.width} × {original.height} · {formatBytes(original.file.size)}
          </p>
          <p className="text-xs text-muted">点击重新选择，或拖拽 / 粘贴新图片替换</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6">
          <p className="text-base font-medium text-text">点击选择图片，或将图片拖拽到此处</p>
          <p className="text-xs text-muted">支持 PNG、JPG、WebP，最大 {formatBytes(MAX_INPUT_BYTES)}；也可使用 Ctrl/Cmd + V 粘贴</p>
        </div>
      )}
    </label>
  );
}

type CompareSliderProps = {
  originalUrl: string;
  resultUrl: string;
  width: number;
  height: number;
  value: number;
  onChange: (value: number) => void;
};

function CompareSlider({ originalUrl, resultUrl, width, height, value, onChange }: CompareSliderProps) {
  const aspectRatio = width && height ? `${width} / ${height}` : '16 / 9';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>← 原图</span>
        <span>处理后 →</span>
      </div>
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-surface-light"
        style={{ aspectRatio }}
      >
        <img
          src={originalUrl}
          alt="原图"
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        <img
          src={resultUrl}
          alt="处理后"
          className="absolute inset-0 h-full w-full object-contain"
          style={{ clipPath: `inset(0 0 0 ${value}%)` }}
          draggable={false}
        />
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
          style={{ left: `${value}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          aria-label="对比滑块"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-light px-4 py-3">
      <dt className="text-xs font-semibold tracking-[0.12em] text-accent-light uppercase">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold ${highlight ? 'text-emerald-600' : 'text-text'}`}>{value}</dd>
      {sub ? <p className="text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] md:p-6">
      <div className="h-6 w-32 animate-pulse rounded bg-surface-light" />
      <div className="aspect-video w-full animate-pulse rounded-xl bg-surface-light" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-16 animate-pulse rounded-xl bg-surface-light" />
        <div className="h-16 animate-pulse rounded-xl bg-surface-light" />
        <div className="h-16 animate-pulse rounded-xl bg-surface-light" />
      </div>
    </section>
  );
}

function mapErrorMessage(raw: string): string {
  switch (raw) {
    case 'FILE_TOO_LARGE':
      return '文件超过 20MB 限制';
    case 'UNSUPPORTED_MIME':
      return '不支持的图片格式';
    case 'CORRUPT_OR_UNSUPPORTED_IMAGE':
      return '图片损坏或格式无法识别';
    case 'NO_FILE':
      return '未检测到上传文件';
    case 'INVALID_PARAMS':
      return '参数无效，请检查后重试';
    default:
      return raw || '处理失败';
  }
}
