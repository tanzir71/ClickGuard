import type { getOverviewMetrics } from './overview';
import type { StatBreakdownRow } from './Stat';

type OverviewMetrics = ReturnType<typeof getOverviewMetrics>;
type DemoBatch = {
  delay: number;
  traffic: [number, number];
  decisions: [number, number, number];
  review: [number, number, number];
  wasted: [number, number, number];
  protected: [number, number, number];
};

// A deterministic, overview-only demo stream. No visitor records or evidence are changed.
// Tuples follow the existing breakdown order; money is stored in cents.
export const OVERVIEW_DEMO_BATCHES: DemoBatch[] = [
  { delay: 3200, traffic: [1, 0], decisions: [0, 0, 0], review: [0, 0, 0], wasted: [0, 0, 240], protected: [0, 0, 0] },
  { delay: 4400, traffic: [2, 0], decisions: [0, 0, 0], review: [1, 0, 0], wasted: [0, 270, 160], protected: [0, 0, 0] },
  { delay: 3800, traffic: [1, 0], decisions: [1, 0, 0], review: [0, 0, 1], wasted: [320, 0, 0], protected: [656, 0, 0] },
  { delay: 5200, traffic: [0, 1], decisions: [0, 0, 0], review: [0, 0, 0], wasted: [0, 0, 0], protected: [0, 0, 0] },
  { delay: 3600, traffic: [1, 0], decisions: [0, 0, 0], review: [1, 0, 0], wasted: [0, 410, 0], protected: [0, 0, 0] },
  { delay: 4600, traffic: [1, 0], decisions: [0, 1, 0], review: [0, 0, 0], wasted: [260, 0, 0], protected: [0, 0, 0] },
  { delay: 3400, traffic: [1, 0], decisions: [1, 0, 0], review: [0, 0, 1], wasted: [380, 0, 0], protected: [0, 779, 0] },
];

/** Derive every headline from the same disjoint rows used in its hover breakdown. */
export function getLiveOverviewMetrics(base: OverviewMetrics, tick: number): OverviewMetrics {
  const steps = Math.max(0, Math.floor(tick));
  const addRows = <Row extends StatBreakdownRow>(rows: Row[], key: 'traffic' | 'decisions' | 'review' | 'wasted' | 'protected', money = false) => rows.map((row, rowIndex) => {
    const extra = OVERVIEW_DEMO_BATCHES.reduce((sum, batch, index) => {
      const occurrences = Math.floor(steps / OVERVIEW_DEMO_BATCHES.length) + (index < steps % OVERVIEW_DEMO_BATCHES.length ? 1 : 0);
      return sum + (batch[key][rowIndex] ?? 0) * occurrences;
    }, 0);
    const value = row.value + extra / (money ? 100 : 1);
    return { ...row, value, ...(money ? { displayValue: value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) } : {}) };
  });
  const trafficRows = addRows(base.trafficRows, 'traffic');
  const decisionRows = addRows(base.decisionRows, 'decisions');
  const reviewRows = addRows(base.reviewRows, 'review');
  const wastedRows = addRows(base.wastedRows, 'wasted', true);
  const protectedRows = addRows(base.protectedRows, 'protected', true);
  const sum = (rows: StatBreakdownRow[]) => rows.reduce((total, row) => total + row.value, 0);
  return {
    visitors: sum(trafficRows), paid: trafficRows[0].value,
    blocked: decisionRows[0].value, pending: decisionRows[1].value, failed: decisionRows[2].value,
    decisions: sum(decisionRows), review: sum(reviewRows), wasted: sum(wastedRows), protected: sum(protectedRows),
    trafficRows, decisionRows, reviewRows, wastedRows, protectedRows,
  };
}
