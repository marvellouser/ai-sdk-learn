export type ProviderId = 'qwen' | 'deepseek' | 'claude';

export const providerOptions: { value: ProviderId; label: string }[] = [
  { value: 'qwen', label: 'Qwen' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'claude', label: 'Claude' },
];
