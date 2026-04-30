export const videoSourceConfigs = [
  {
    id: 'youtube',
    label: 'YouTube',
    pageHosts: ['youtube.com', 'youtu.be'],
    pageHostSuffixes: ['.youtube.com'],
    auxiliaryHosts: ['youtube.com', 'googlevideo.com'],
    auxiliaryHostSuffixes: ['.youtube.com', '.googlevideo.com'],
  },
  {
    id: 'bilibili',
    label: 'bilibili',
    pageHosts: ['bilibili.com', 'b23.tv'],
    pageHostSuffixes: ['.bilibili.com'],
    auxiliaryHosts: ['bilibili.com', 'hdslb.com'],
    auxiliaryHostSuffixes: ['.bilibili.com', '.hdslb.com'],
  },
  {
    id: 'douyin',
    label: 'douyin',
    pageHosts: ['douyin.com', 'iesdouyin.com'],
    pageHostSuffixes: ['.douyin.com', '.iesdouyin.com'],
    auxiliaryHosts: ['douyin.com', 'iesdouyin.com'],
    auxiliaryHostSuffixes: ['.douyin.com', '.iesdouyin.com', '.byteimg.com', '.bytecdn.cn'],
  },
] as const;

export type VideoSource = (typeof videoSourceConfigs)[number]['id'];

export const videoSourceIds = videoSourceConfigs.map(source => source.id) as [VideoSource, ...VideoSource[]];

export function getVideoSourceConfig(source: VideoSource) {
  return videoSourceConfigs.find(config => config.id === source)!;
}

function isHostAllowed(host: string, exactHosts: readonly string[], suffixes: readonly string[]): boolean {
  const normalizedHost = host.toLowerCase();
  return exactHosts.includes(normalizedHost) || suffixes.some(suffix => normalizedHost.endsWith(suffix));
}

export function getVideoSourceConfigByHost(host: string) {
  return videoSourceConfigs.find(config => isHostAllowed(host, config.pageHosts, config.pageHostSuffixes)) ?? null;
}

export function isAllowedVideoAuxiliaryHost(source: VideoSource, host: string): boolean {
  const config = getVideoSourceConfig(source);
  return isHostAllowed(host, config.auxiliaryHosts, config.auxiliaryHostSuffixes);
}
