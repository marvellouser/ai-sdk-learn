export const videoSourceConfigs = [
  {
    id: 'youtube',
    label: 'YouTube',
    pageHosts: ['youtube.com', 'youtu.be'],
  },
  {
    id: 'bilibili',
    label: 'bilibili',
    pageHosts: ['bilibili.com', 'b23.tv'],
  },
  {
    id: 'douyin',
    label: 'douyin',
    pageHosts: ['douyin.com', 'iesdouyin.com'],
  },
] as const;

export type VideoSource = (typeof videoSourceConfigs)[number]['id'];

export function sourceLabel(source: VideoSource): string {
  return videoSourceConfigs.find(config => config.id === source)?.label ?? source;
}

export function supportedVideoSourceLabel(): string {
  return videoSourceConfigs.map(config => config.label).join('、');
}
