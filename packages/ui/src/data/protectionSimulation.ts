import type { getOverviewMetrics } from './overview';
import type { StatBreakdownRow } from './Stat';

export type ProtectionMode = 'active' | 'paused';
export interface SpendSimulation {
  tick: number;
  wastedCents: number;
  protectedCents: number;
}
export const PROTECTION_STORAGE_KEY = 'clickguard:protection-demo:v1';
export const SPEND_STORAGE_KEY = 'clickguard:spend-demo:v1';
export const SPEND_TICK_MS = 4000;
export const SPEND_DEMO_CENTS = [240, 320, 180, 410, 260] as const;
export const EMPTY_SPEND: SpendSimulation = { tick: 0, wastedCents: 0, protectedCents: 0 };

/** Illustrative spend only: never invent visitors, decisions, or recorded clicks. */
export function advanceSpend(state: SpendSimulation, mode: ProtectionMode): SpendSimulation {
  const cents = SPEND_DEMO_CENTS[state.tick % SPEND_DEMO_CENTS.length];
  return {
    tick: state.tick + 1,
    wastedCents: state.wastedCents + (mode === 'paused' ? cents : 0),
    protectedCents: state.protectedCents + (mode === 'active' ? cents : 0),
  };
}

export function parseSpend(raw: string | null): SpendSimulation {
  try {
    const value = JSON.parse(raw ?? 'null') as Partial<SpendSimulation> | null;
    if (value && [value.tick, value.wastedCents, value.protectedCents].every(
      (number) => typeof number === 'number' && Number.isSafeInteger(number) && number >= 0,
    )) return { tick: value.tick!, wastedCents: value.wastedCents!, protectedCents: value.protectedCents! };
  } catch { /* Invalid or old storage starts a fresh demo. */ }
  return { ...EMPTY_SPEND };
}

export function getSpendOverviewMetrics(base: ReturnType<typeof getOverviewMetrics>, spend: SpendSimulation) {
  const row = (label: string, cents: number, tone: StatBreakdownRow['tone']): StatBreakdownRow => ({
    label, value: cents / 100, tone,
    displayValue: (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
  });
  const wastedRows = [...base.wastedRows, row('Simulated waste while paused', spend.wastedCents, 'danger')];
  const protectedRows = [...base.protectedRows, row('Simulated protection while active', spend.protectedCents, 'success')];
  return {
    ...base,
    wasted: wastedRows.reduce((total, item) => total + item.value, 0),
    protected: protectedRows.reduce((total, item) => total + item.value, 0),
    wastedRows, protectedRows,
  };
}
