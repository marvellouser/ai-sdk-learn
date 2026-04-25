'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  calculateFutureValue,
  solveRequiredPeriods,
  solveRequiredRate,
  type CompoundCalculationResult,
  type ContributionTiming,
  type InvestmentMode,
  type PeriodUnit,
} from '../lib/compound-interest';

type CalculatorMode = 'future-value' | 'target';
type TargetMode = 'periods' | 'rate';

type FormState = {
  calculatorMode: CalculatorMode;
  targetMode: TargetMode;
  investmentMode: InvestmentMode;
  contributionTiming: ContributionTiming;
  periodUnit: PeriodUnit;
  initialPrincipal: string;
  periodicContribution: string;
  periods: string;
  ratePercent: string;
  targetAmount: string;
};

type DisplayResult = {
  kind: CalculatorMode;
  periodUnit: PeriodUnit;
  targetMode?: TargetMode;
  requiredPeriods?: number;
  requiredRatePercent?: number;
  result: CompoundCalculationResult;
};

type SegmentOption<T extends string> = {
  label: string;
  value: T;
};

const defaultFormState: FormState = {
  calculatorMode: 'future-value',
  targetMode: 'periods',
  investmentMode: 'fixed',
  contributionTiming: 'end',
  periodUnit: 'year',
  initialPrincipal: '10000',
  periodicContribution: '1000',
  periods: '10',
  ratePercent: '8',
  targetAmount: '100000',
};

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  currency: 'CNY',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

const percentFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 4,
  minimumFractionDigits: 0,
});

function parseNumber(value: string, label: string): number {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label}不能为空`);
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label}必须是有效数字`);
  }

  return parsed;
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

function NumberField({
  helper,
  label,
  min,
  onChange,
  step = '0.01',
  suffix,
  value,
}: {
  helper?: string;
  label: string;
  min?: string;
  onChange: (value: string) => void;
  step?: string;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-text">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-border bg-surface-light transition focus-within:border-accent">
        <input
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-text outline-none"
          inputMode="decimal"
          min={min}
          step={step}
          type="number"
          value={value}
          onChange={event => onChange(event.target.value)}
        />
        {suffix ? <span className="grid min-w-12 place-items-center border-l border-border px-3 text-sm text-muted">{suffix}</span> : null}
      </div>
      {helper ? <span className="text-xs leading-5 text-muted">{helper}</span> : null}
    </label>
  );
}

function SegmentedControl<T extends string>({
  options,
  onChange,
  value,
}: {
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  value: T;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-light p-1">
      {options.map(option => {
        const isActive = value === option.value;

        return (
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-accent text-white shadow-[0_8px_18px_rgba(0,113,227,0.18)]' : 'text-muted hover:bg-white/70 hover:text-text'
            }`}
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CompoundInterestCalculator() {
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [displayResult, setDisplayResult] = useState<DisplayResult | null>(null);
  const [error, setError] = useState('');

  const periodLabel = form.periodUnit === 'year' ? '年' : '月';
  const modeLabel = form.investmentMode === 'fixed' ? '固定本金' : '定投复利';
  const resultPeriodLabel = displayResult?.periodUnit === 'month' ? '月' : '年';

  const resultSummary = useMemo(() => {
    if (!displayResult) {
      return [];
    }

    const summaryPeriodLabel = displayResult.periodUnit === 'month' ? '月' : '年';
    const items = [
      { label: '总本金', value: formatCurrency(displayResult.result.totalPrincipal) },
      { label: '总收益', value: formatCurrency(displayResult.result.totalProfit) },
      { label: '最终金额', value: formatCurrency(displayResult.result.finalAmount) },
    ];

    if (displayResult.requiredPeriods !== undefined) {
      items.unshift({ label: '所需期数', value: `${displayResult.requiredPeriods} ${summaryPeriodLabel}` });
    }

    if (displayResult.requiredRatePercent !== undefined) {
      items.unshift({ label: '所需年化收益率', value: formatPercent(displayResult.requiredRatePercent) });
    }

    return items;
  }, [displayResult]);

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(defaultFormState);
    setDisplayResult(null);
    setError('');
  }

  function handleCalculate() {
    setError('');

    try {
      const initialPrincipal = parseNumber(form.initialPrincipal, '初始本金');
      const periodicContribution =
        form.investmentMode === 'recurring' ? parseNumber(form.periodicContribution, '每期投入金额') : undefined;

      if (form.calculatorMode === 'future-value') {
        const periods = parseNumber(form.periods, '计算期数');
        const ratePercent = parseNumber(form.ratePercent, '年化收益率');
        const result = calculateFutureValue({
          contributionTiming: form.contributionTiming,
          initialPrincipal,
          investmentMode: form.investmentMode,
          periodUnit: form.periodUnit,
          periodicContribution,
          periods,
          ratePercent,
        });

        setDisplayResult({
          kind: 'future-value',
          periodUnit: form.periodUnit,
          result,
        });
        return;
      }

      const targetAmount = parseNumber(form.targetAmount, '目标金额');

      if (form.targetMode === 'periods') {
        const ratePercent = parseNumber(form.ratePercent, '年化收益率');
        const solved = solveRequiredPeriods({
          contributionTiming: form.contributionTiming,
          initialPrincipal,
          investmentMode: form.investmentMode,
          periodUnit: form.periodUnit,
          periodicContribution,
          ratePercent,
          targetAmount,
        });

        setDisplayResult({
          kind: 'target',
          periodUnit: form.periodUnit,
          requiredPeriods: solved.requiredPeriods,
          result: solved.result,
          targetMode: 'periods',
        });
        return;
      }

      const periods = parseNumber(form.periods, '计算期数');
      const solved = solveRequiredRate({
        contributionTiming: form.contributionTiming,
        initialPrincipal,
        investmentMode: form.investmentMode,
        periodUnit: form.periodUnit,
        periodicContribution,
        periods,
        targetAmount,
      });

      setDisplayResult({
        kind: 'target',
        periodUnit: form.periodUnit,
        requiredRatePercent: solved.requiredRatePercent,
        result: solved.result,
        targetMode: 'rate',
      });
    } catch (calculateError) {
      setDisplayResult(null);
      setError(calculateError instanceof Error ? calculateError.message : '计算失败，请检查输入');
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6 md:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-10">
        <div className="pointer-events-none absolute -top-16 -right-14 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-accent-light">COMPOUND INTEREST</p>
            <h1 className="text-balance text-4xl leading-tight font-semibold text-text md:text-5xl">复利计算器</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
              计算固定本金或定投复利的终值，也可以按目标金额反推所需期数或年化收益率。
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

      <section className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            <span className="text-sm font-semibold text-text">计算模式</span>
            <SegmentedControl
              options={[
                { label: '计算终值', value: 'future-value' },
                { label: '目标反推', value: 'target' },
              ]}
              value={form.calculatorMode}
              onChange={value => updateForm('calculatorMode', value)}
            />
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-semibold text-text">投资方式</span>
            <SegmentedControl
              options={[
                { label: '固定本金', value: 'fixed' },
                { label: '定投复利', value: 'recurring' },
              ]}
              value={form.investmentMode}
              onChange={value => updateForm('investmentMode', value)}
            />
          </div>
        </div>

        {form.calculatorMode === 'target' ? (
          <div className="grid gap-2">
            <span className="text-sm font-semibold text-text">反推类型</span>
            <SegmentedControl
              options={[
                { label: '算所需期数', value: 'periods' },
                { label: '算所需收益率', value: 'rate' },
              ]}
              value={form.targetMode}
              onChange={value => updateForm('targetMode', value)}
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <NumberField label="初始本金" min="0" suffix="元" value={form.initialPrincipal} onChange={value => updateForm('initialPrincipal', value)} />

          {form.investmentMode === 'recurring' ? (
            <NumberField
              label="每期投入金额"
              min="0"
              suffix="元"
              value={form.periodicContribution}
              onChange={value => updateForm('periodicContribution', value)}
            />
          ) : null}

          {form.calculatorMode === 'target' ? (
            <NumberField label="目标金额" min="0.01" suffix="元" value={form.targetAmount} onChange={value => updateForm('targetAmount', value)} />
          ) : null}

          {form.calculatorMode === 'future-value' || form.targetMode === 'rate' ? (
            <NumberField label="计算期数" min="1" step="1" suffix={periodLabel} value={form.periods} onChange={value => updateForm('periods', value)} />
          ) : null}

          {form.calculatorMode === 'future-value' || form.targetMode === 'periods' ? (
            <NumberField
              helper={`输入年化收益率，${periodLabel}度期数会自动换算为对应复利周期`}
              label="年化收益率"
              step="0.01"
              suffix="%"
              value={form.ratePercent}
              onChange={value => updateForm('ratePercent', value)}
            />
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-text">期数单位</span>
            <select
              className="rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent"
              value={form.periodUnit}
              onChange={event => updateForm('periodUnit', event.target.value as PeriodUnit)}
            >
              <option value="year">年</option>
              <option value="month">月</option>
            </select>
          </label>

          {form.investmentMode === 'recurring' ? (
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-text">投入时点</span>
              <select
                className="rounded-xl border border-border bg-surface-light px-4 py-2.5 text-sm text-text outline-none transition focus:border-accent"
                value={form.contributionTiming}
                onChange={event => updateForm('contributionTiming', event.target.value as ContributionTiming)}
              >
                <option value="end">期末投入</option>
                <option value="beginning">期初投入</option>
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-light"
            type="button"
            onClick={handleCalculate}
          >
            开始计算
          </button>
          <button
            className="inline-flex items-center rounded-full border border-border bg-surface-light px-4 py-2.5 text-sm text-text transition hover:border-accent-light hover:text-accent-light"
            type="button"
            onClick={resetForm}
          >
            重置
          </button>
          <span className="text-sm text-muted">
            当前：{modeLabel} / 按{periodLabel}计期 / 年化收益率
          </span>
        </div>

        {error ? <p className="rounded-xl border border-error/25 bg-red-50 px-4 py-3 text-sm text-error">{error}</p> : null}
      </section>

      {displayResult ? (
        <section className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] md:p-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-accent-light">RESULT</p>
            <h2 className="mt-2 text-2xl font-semibold text-text">计算结果</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {resultSummary.map(item => (
              <div className="rounded-xl border border-border bg-surface-light px-4 py-3" key={item.label}>
                <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-text">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border bg-surface-light px-4 py-3">
              <h3 className="text-base font-semibold text-text">每期明细</h3>
            </div>
            <div className="max-h-[34rem] overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-border text-muted">
                    <th className="px-4 py-3 font-medium">期数</th>
                    <th className="px-4 py-3 font-medium">当期投入</th>
                    <th className="px-4 py-3 font-medium">累计本金</th>
                    <th className="px-4 py-3 font-medium">当期收益</th>
                    <th className="px-4 py-3 font-medium">期末金额</th>
                  </tr>
                </thead>
                <tbody>
                  {displayResult.result.details.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-muted" colSpan={5}>
                        目标金额已达成，无需新增期数。
                      </td>
                    </tr>
                  ) : (
                    displayResult.result.details.map(detail => (
                      <tr className="border-b border-border last:border-b-0" key={detail.period}>
                        <td className="px-4 py-3 text-text">
                          第 {detail.period} {resultPeriodLabel}
                        </td>
                        <td className="px-4 py-3 text-muted">{formatCurrency(detail.contribution)}</td>
                        <td className="px-4 py-3 text-muted">{formatCurrency(detail.cumulativePrincipal)}</td>
                        <td className="px-4 py-3 text-muted">{formatCurrency(detail.periodProfit)}</td>
                        <td className="px-4 py-3 font-medium text-text">{formatCurrency(detail.endingAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-surface-light/45 p-5 text-sm text-muted">
          输入参数后点击计算，结果会展示在这里。
        </section>
      )}
    </main>
  );
}
