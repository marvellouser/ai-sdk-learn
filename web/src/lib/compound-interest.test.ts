import { describe, expect, it } from 'vitest';

import { calculateFutureValue, solveRequiredPeriods, solveRequiredRate } from './compound-interest';

describe('compound interest calculations', () => {
  it('calculates future value for fixed principal', () => {
    const result = calculateFutureValue({
      initialPrincipal: 10000,
      periods: 2,
      ratePercent: 10,
      investmentMode: 'fixed',
    });

    expect(result.finalAmount).toBeCloseTo(12100);
    expect(result.totalPrincipal).toBe(10000);
    expect(result.totalProfit).toBeCloseTo(2100);
    expect(result.details).toHaveLength(2);
  });

  it('converts annualized rate for monthly fixed-principal calculations', () => {
    const result = calculateFutureValue({
      initialPrincipal: 10000,
      periods: 2,
      periodUnit: 'month',
      ratePercent: 12,
      investmentMode: 'fixed',
    });

    expect(result.finalAmount).toBeCloseTo(10000 * Math.pow(1.12, 2 / 12));
    expect(result.details[0]?.periodProfit).toBeCloseTo(10000 * (Math.pow(1.12, 1 / 12) - 1));
  });

  it('calculates recurring contributions at period end', () => {
    const result = calculateFutureValue({
      initialPrincipal: 1000,
      periodicContribution: 100,
      periods: 2,
      ratePercent: 10,
      investmentMode: 'recurring',
      contributionTiming: 'end',
    });

    expect(result.finalAmount).toBeCloseTo(1420);
    expect(result.totalPrincipal).toBe(1200);
    expect(result.totalProfit).toBeCloseTo(220);
    expect(result.details[0]?.periodProfit).toBeCloseTo(100);
    expect(result.details[0]?.endingAmount).toBeCloseTo(1200);
    expect(result.details[1]?.periodProfit).toBeCloseTo(120);
  });

  it('calculates recurring contributions at period beginning', () => {
    const result = calculateFutureValue({
      initialPrincipal: 1000,
      periodicContribution: 100,
      periods: 2,
      ratePercent: 10,
      investmentMode: 'recurring',
      contributionTiming: 'beginning',
    });

    expect(result.finalAmount).toBeCloseTo(1441);
    expect(result.totalPrincipal).toBe(1200);
    expect(result.totalProfit).toBeCloseTo(241);
    expect(result.details[0]?.periodProfit).toBeCloseTo(110);
    expect(result.details[1]?.periodProfit).toBeCloseTo(131);
  });

  it('solves required periods for fixed principal', () => {
    const result = solveRequiredPeriods({
      initialPrincipal: 10000,
      targetAmount: 12100,
      ratePercent: 10,
      investmentMode: 'fixed',
    });

    expect(result.requiredPeriods).toBe(2);
    expect(result.result.finalAmount).toBeCloseTo(12100);
  });

  it('solves required monthly periods from an annualized rate', () => {
    const result = solveRequiredPeriods({
      initialPrincipal: 10000,
      targetAmount: 10000 * Math.pow(1.12, 2 / 12),
      periodUnit: 'month',
      ratePercent: 12,
      investmentMode: 'fixed',
    });

    expect(result.requiredPeriods).toBe(2);
  });

  it('solves required periods for recurring contributions', () => {
    const result = solveRequiredPeriods({
      initialPrincipal: 1000,
      periodicContribution: 100,
      targetAmount: 1420,
      ratePercent: 10,
      investmentMode: 'recurring',
      contributionTiming: 'end',
    });

    expect(result.requiredPeriods).toBe(2);
    expect(result.result.details).toHaveLength(2);
  });

  it('solves required rate for fixed principal', () => {
    const result = solveRequiredRate({
      initialPrincipal: 10000,
      targetAmount: 12100,
      periods: 2,
      investmentMode: 'fixed',
    });

    expect(result.requiredRatePercent).toBeCloseTo(10);
    expect(result.result.finalAmount).toBeCloseTo(12100);
  });

  it('solves annualized rate for monthly fixed-principal targets', () => {
    const result = solveRequiredRate({
      initialPrincipal: 10000,
      targetAmount: 12100,
      periods: 24,
      periodUnit: 'month',
      investmentMode: 'fixed',
    });

    expect(result.requiredRatePercent).toBeCloseTo(10);
    expect(result.result.finalAmount).toBeCloseTo(12100);
  });

  it('solves required rate for recurring contributions', () => {
    const result = solveRequiredRate({
      initialPrincipal: 1000,
      periodicContribution: 100,
      targetAmount: 1420,
      periods: 2,
      investmentMode: 'recurring',
      contributionTiming: 'end',
    });

    expect(result.requiredRatePercent).toBeCloseTo(10);
    expect(result.result.finalAmount).toBeCloseTo(1420);
  });

  it('solves recurring rates near the max annualized rate boundary', () => {
    const result = solveRequiredRate({
      initialPrincipal: 100,
      periodicContribution: 100,
      targetAmount: 1100,
      periods: 1,
      investmentMode: 'recurring',
      contributionTiming: 'end',
      maxRatePercent: 1000,
    });

    expect(result.requiredRatePercent).toBeCloseTo(900);
    expect(result.result.finalAmount).toBeCloseTo(1100);
  });

  it('returns zero periods when the target is already reached', () => {
    const result = solveRequiredPeriods({
      initialPrincipal: 10000,
      targetAmount: 9000,
      ratePercent: 8,
      investmentMode: 'fixed',
    });

    expect(result.requiredPeriods).toBe(0);
    expect(result.result.finalAmount).toBe(10000);
  });

  it('handles zero rate scenarios', () => {
    const fixed = calculateFutureValue({
      initialPrincipal: 10000,
      periods: 10,
      ratePercent: 0,
      investmentMode: 'fixed',
    });
    const recurring = calculateFutureValue({
      initialPrincipal: 1000,
      periodicContribution: 100,
      periods: 3,
      ratePercent: 0,
      investmentMode: 'recurring',
      contributionTiming: 'end',
    });

    expect(fixed.finalAmount).toBe(10000);
    expect(fixed.totalProfit).toBe(0);
    expect(recurring.finalAmount).toBe(1300);
    expect(recurring.totalPrincipal).toBe(1300);
    expect(recurring.totalProfit).toBe(0);
  });

  it('throws clear errors for invalid input', () => {
    expect(() =>
      calculateFutureValue({
        initialPrincipal: -1,
        periods: 1,
        ratePercent: 8,
        investmentMode: 'fixed',
      }),
    ).toThrow('初始本金不能小于 0');

    expect(() =>
      solveRequiredRate({
        initialPrincipal: 0,
        targetAmount: 1000,
        periods: 10,
        investmentMode: 'fixed',
      }),
    ).toThrow('固定本金模式下初始本金必须大于 0');
  });
});
