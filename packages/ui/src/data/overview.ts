import type { VisitorStatus, VisitorVM } from '../model';
import type { StatBreakdownRow } from './Stat';

const isBlockDecision = (status: VisitorStatus) =>
  status === 'blocked' || status === 'pending' || status === 'failed';
const money = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const withMoney = (rows: StatBreakdownRow[]) =>
  rows.map((row) => ({ ...row, displayValue: money(row.value) }));

/** Account-wide totals: each breakdown is a disjoint partition of its headline. */
export function getOverviewMetrics(visitors: VisitorVM[]) {
  const paid = visitors.filter((visitor) => visitor.paidVisits > 0).length;
  const blocked = visitors.filter((visitor) => visitor.status === 'blocked').length;
  const pending = visitors.filter((visitor) => visitor.status === 'pending').length;
  const failed = visitors.filter((visitor) => visitor.status === 'failed').length;
  const review = visitors.filter((visitor) => visitor.needsReview);
  const reviewMonitoring = review.filter((visitor) => visitor.status === 'monitoring').length;
  const reviewFailed = review.filter((visitor) => visitor.status === 'failed').length;
  const reviewBlocked = review.filter((visitor) => visitor.status === 'blocked').length;
  const reviewOther = review.length - reviewMonitoring - reviewFailed - reviewBlocked;
  const wasted = [
    { label: 'Block decisions', value: 0, tone: 'danger' },
    { label: 'Monitoring', value: 0, tone: 'warning' },
    { label: 'Clean / allowed', value: 0, tone: 'muted' },
  ] satisfies StatBreakdownRow[];
  const protectedSpend = [
    { label: 'Data-center / VPN / proxy', value: 0, tone: 'success' },
    { label: 'Residential', value: 0, tone: 'default' },
    { label: 'Mobile / other networks', value: 0, tone: 'muted' },
  ] satisfies StatBreakdownRow[];
  for (const visitor of visitors) {
    const spendBucket = isBlockDecision(visitor.status) ? 0 : visitor.status === 'monitoring' ? 1 : 2;
    wasted[spendBucket].value += visitor.wastedSpend;
    const networkBucket = ['datacenter', 'vpn', 'proxy', 'tor'].includes(visitor.networkType)
      ? 0
      : visitor.networkType === 'residential'
        ? 1
        : 2;
    protectedSpend[networkBucket].value += visitor.protectedSpendEst;
  }
  return {
    visitors: visitors.length,
    paid,
    blocked,
    pending,
    failed,
    decisions: blocked + pending + failed,
    review: review.length,
    wasted: wasted.reduce((sum, row) => sum + row.value, 0),
    protected: protectedSpend.reduce((sum, row) => sum + row.value, 0),
    trafficRows: [
      { label: 'With paid traffic', value: paid, tone: 'default' },
      { label: 'Unpaid traffic only', value: visitors.length - paid, tone: 'muted' },
    ] satisfies StatBreakdownRow[],
    decisionRows: [
      { label: 'Blocked', value: blocked, tone: 'danger' },
      { label: 'Pending exclusion', value: pending, tone: 'warning' },
      { label: 'Exclusion failed', value: failed, tone: 'muted' },
    ] satisfies StatBreakdownRow[],
    reviewRows: [
      { label: 'Monitoring', value: reviewMonitoring, tone: 'warning' },
      { label: 'Exclusion failed', value: reviewFailed, tone: 'danger' },
      { label: 'Unreviewed blocks', value: reviewBlocked, tone: 'default' },
      ...(reviewOther
        ? [{ label: 'Other flagged visitors', value: reviewOther, tone: 'muted' as const }]
        : []),
    ] satisfies StatBreakdownRow[],
    wastedRows: withMoney(wasted),
    protectedRows: withMoney(protectedSpend),
  };
}
