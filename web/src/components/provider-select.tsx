import { providerOptions, type ProviderId } from '../lib/providers';

export type { ProviderId };

export function ProviderSelect({
  value,
  onChange,
  className = '',
}: {
  value: ProviderId;
  onChange: (provider: ProviderId) => void;
  className?: string;
}) {
  return (
    <select
      className={`rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent ${className}`}
      value={value}
      onChange={event => onChange(event.target.value as ProviderId)}
    >
      {providerOptions.map(p => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
