export type InvestmentMode = 'fixed' | 'recurring';
export type ContributionTiming = 'end' | 'beginning';
export type PeriodUnit = 'year' | 'month';

export type CompoundPeriodDetail = {
  period: number;
  contribution: number;
  cumulativePrincipal: number;
  periodProfit: number;
  endingAmount: number;
};

export type CompoundCalculationResult = {
  periods: number;
  totalPrincipal: number;
  totalProfit: number;
  finalAmount: number;
  details: CompoundPeriodDetail[];
};

export type CompoundCalculationInput = {
  initialPrincipal: number;
  periodicContribution?: number;
  periods: number;
  periodUnit?: PeriodUnit;
  ratePercent: number;
  investmentMode?: InvestmentMode;
  contributionTiming?: ContributionTiming;
};

export type TargetPeriodsInput = Omit<CompoundCalculationInput, 'periods'> & {
  targetAmount: number;
  maxPeriods?: number;
};

export type TargetPeriodsResult = {
  requiredPeriods: number;
  result: CompoundCalculationResult;
};

export type TargetRateInput = Omit<CompoundCalculationInput, 'ratePercent'> & {
  targetAmount: number;
  maxRatePercent?: number;
};

export type TargetRateResult = {
  requiredRatePercent: number;
  result: CompoundCalculationResult;
};

const DEFAULT_MAX_PERIODS = 1200;
const DEFAULT_MAX_RATE_PERCENT = 1000;
const RATE_SEARCH_ITERATIONS = 100;

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label}必须是有效数字`);
  }
}

function assertNonNegative(value: number, label: string) {
  assertFiniteNumber(value, label);

  if (value < 0) {
    throw new Error(`${label}不能小于 0`);
  }
}

function assertPositive(value: number, label: string) {
  assertFiniteNumber(value, label);

  if (value <= 0) {
    throw new Error(`${label}必须大于 0`);
  }
}

function assertNonNegativeInteger(value: number, label: string) {
  assertNonNegative(value, label);

  if (!Number.isInteger(value)) {
    throw new Error(`${label}必须是整数`);
  }
}

function normalizeInvestmentMode(mode: InvestmentMode | undefined): InvestmentMode {
  return mode ?? 'fixed';
}

function normalizeContributionTiming(timing: ContributionTiming | undefined): ContributionTiming {
  return timing ?? 'end';
}

function normalizePeriodUnit(periodUnit: PeriodUnit | undefined): PeriodUnit {
  return periodUnit ?? 'year';
}

function annualRateToPeriodRate(annualRate: number, periodUnit: PeriodUnit | undefined): number {
  return normalizePeriodUnit(periodUnit) === 'month' ? Math.pow(1 + annualRate, 1 / 12) - 1 : annualRate;
}

function periodRateToAnnualRate(periodRate: number, periodUnit: PeriodUnit | undefined): number {
  return normalizePeriodUnit(periodUnit) === 'month' ? Math.pow(1 + periodRate, 12) - 1 : periodRate;
}

function getPeriodicContribution(input: Pick<CompoundCalculationInput, 'investmentMode' | 'periodicContribution'>): number {
  return normalizeInvestmentMode(input.investmentMode) === 'recurring' ? (input.periodicContribution ?? 0) : 0;
}

function validateRatePercent(ratePercent: number) {
  assertFiniteNumber(ratePercent, '收益率');

  if (ratePercent <= -100) {
    throw new Error('收益率必须大于 -100%');
  }
}

function calculateWithPeriodRate(input: CompoundCalculationInput, rate: number, allowZeroPeriods: boolean): CompoundCalculationResult {
  assertNonNegative(input.initialPrincipal, '初始本金');
  assertNonNegativeInteger(input.periods, '计算期数');

  if (!allowZeroPeriods && input.periods <= 0) {
    throw new Error('计算期数必须大于 0');
  }

  const mode = normalizeInvestmentMode(input.investmentMode);
  const contributionTiming = normalizeContributionTiming(input.contributionTiming);
  const periodicContribution = getPeriodicContribution(input);
  assertNonNegative(periodicContribution, '每期投入金额');

  let amount = input.initialPrincipal;
  let cumulativePrincipal = input.initialPrincipal;
  const details: CompoundPeriodDetail[] = [];

  for (let period = 1; period <= input.periods; period += 1) {
    let contribution = 0;

    if (mode === 'recurring' && contributionTiming === 'beginning') {
      contribution = periodicContribution;
      amount += contribution;
      cumulativePrincipal += contribution;
    }

    const periodProfit = amount * rate;
    amount += periodProfit;

    if (mode === 'recurring' && contributionTiming === 'end') {
      contribution = periodicContribution;
      amount += contribution;
      cumulativePrincipal += contribution;
    }

    details.push({
      period,
      contribution,
      cumulativePrincipal,
      periodProfit,
      endingAmount: amount,
    });
  }

  return {
    periods: input.periods,
    totalPrincipal: cumulativePrincipal,
    totalProfit: amount - cumulativePrincipal,
    finalAmount: amount,
    details,
  };
}

export function calculateFutureValue(input: CompoundCalculationInput): CompoundCalculationResult {
  validateRatePercent(input.ratePercent);

  return calculateWithPeriodRate(input, annualRateToPeriodRate(input.ratePercent / 100, input.periodUnit), false);
}

export function solveRequiredPeriods(input: TargetPeriodsInput): TargetPeriodsResult {
  assertPositive(input.targetAmount, '目标金额');
  validateRatePercent(input.ratePercent);
  assertNonNegative(input.initialPrincipal, '初始本金');

  const mode = normalizeInvestmentMode(input.investmentMode);
  const periodicContribution = getPeriodicContribution(input);
  assertNonNegative(periodicContribution, '每期投入金额');

  const periodRate = annualRateToPeriodRate(input.ratePercent / 100, input.periodUnit);
  const zeroPeriodResult = calculateWithPeriodRate({ ...input, periods: 0 }, periodRate, true);

  if (zeroPeriodResult.finalAmount >= input.targetAmount) {
    return {
      requiredPeriods: 0,
      result: zeroPeriodResult,
    };
  }

  if (mode === 'fixed') {
    if (input.initialPrincipal <= 0) {
      throw new Error('固定本金模式下初始本金必须大于 0');
    }

    if (periodRate <= 0) {
      throw new Error('收益率必须大于 0 才能达到更高目标金额');
    }

    const requiredPeriods = Math.ceil(Math.log(input.targetAmount / input.initialPrincipal) / Math.log(1 + periodRate));

    return {
      requiredPeriods,
      result: calculateWithPeriodRate({ ...input, periods: requiredPeriods }, periodRate, true),
    };
  }

  const maxPeriods = input.maxPeriods ?? DEFAULT_MAX_PERIODS;
  assertNonNegativeInteger(maxPeriods, '最大期数');

  if (maxPeriods <= 0) {
    throw new Error('最大期数必须大于 0');
  }

  for (let periods = 1; periods <= maxPeriods; periods += 1) {
    const result = calculateWithPeriodRate({ ...input, periods }, periodRate, true);

    if (result.finalAmount >= input.targetAmount) {
      return {
        requiredPeriods: periods,
        result,
      };
    }
  }

  throw new Error(`在 ${maxPeriods} 期内无法达到目标金额`);
}

export function solveRequiredRate(input: TargetRateInput): TargetRateResult {
  assertPositive(input.targetAmount, '目标金额');
  assertNonNegative(input.initialPrincipal, '初始本金');
  assertNonNegativeInteger(input.periods, '计算期数');

  if (input.periods <= 0) {
    throw new Error('计算期数必须大于 0');
  }

  const mode = normalizeInvestmentMode(input.investmentMode);
  const periodicContribution = getPeriodicContribution(input);
  assertNonNegative(periodicContribution, '每期投入金额');

  const zeroRateResult = calculateWithPeriodRate({ ...input, ratePercent: 0 }, 0, true);

  if (zeroRateResult.finalAmount >= input.targetAmount) {
    return {
      requiredRatePercent: 0,
      result: zeroRateResult,
    };
  }

  if (mode === 'fixed') {
    if (input.initialPrincipal <= 0) {
      throw new Error('固定本金模式下初始本金必须大于 0');
    }

    const requiredPeriodRate = Math.pow(input.targetAmount / input.initialPrincipal, 1 / input.periods) - 1;
    const requiredAnnualRate = periodRateToAnnualRate(requiredPeriodRate, input.periodUnit);

    return {
      requiredRatePercent: requiredAnnualRate * 100,
      result: calculateWithPeriodRate({ ...input, ratePercent: requiredAnnualRate * 100 }, requiredPeriodRate, true),
    };
  }

  const maxRatePercent = input.maxRatePercent ?? DEFAULT_MAX_RATE_PERCENT;
  assertPositive(maxRatePercent, '最大收益率');

  let low = 0;
  const maxAnnualRate = maxRatePercent / 100;
  let high = Math.min(0.1, maxAnnualRate);

  while (true) {
    const result = calculateWithPeriodRate(
      { ...input, ratePercent: high * 100 },
      annualRateToPeriodRate(high, input.periodUnit),
      true,
    );

    if (result.finalAmount >= input.targetAmount) {
      break;
    }

    if (high >= maxAnnualRate) {
      throw new Error(`在 ${maxRatePercent}% 收益率内无法达到目标金额`);
    }

    low = high;
    high = Math.min(high * 2, maxAnnualRate);
  }

  for (let index = 0; index < RATE_SEARCH_ITERATIONS; index += 1) {
    const middle = (low + high) / 2;
    const result = calculateWithPeriodRate(
      { ...input, ratePercent: middle * 100 },
      annualRateToPeriodRate(middle, input.periodUnit),
      true,
    );

    if (result.finalAmount >= input.targetAmount) {
      high = middle;
    } else {
      low = middle;
    }
  }

  const requiredRatePercent = high * 100;

  return {
    requiredRatePercent,
    result: calculateWithPeriodRate(
      { ...input, ratePercent: requiredRatePercent },
      annualRateToPeriodRate(high, input.periodUnit),
      true,
    ),
  };
}
