import { getServerUrl } from './config';

type RequestJsonOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getServerUrl()}${normalizedPath}`;
}

async function getErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? `请求失败：${response.status}`;
}

export async function requestJson<T>(path: string, options: RequestJsonOptions = {}): Promise<T> {
  const { body, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const init: RequestInit = {
    ...requestOptions,
    headers,
  };

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  const response = await fetch(apiUrl(path), init);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function requestTextStream(
  path: string,
  options: RequestJsonOptions,
  onChunk: (collected: string) => void,
): Promise<string> {
  const { body, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const init: RequestInit = {
    ...requestOptions,
    headers,
  };

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  const response = await fetch(apiUrl(path), init);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('浏览器未返回可读取流。');
  }

  const decoder = new TextDecoder();
  let collected = '';

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }

    collected += decoder.decode(chunk.value, { stream: true });
    onChunk(collected);
  }

  collected += decoder.decode();
  onChunk(collected);

  return collected;
}
