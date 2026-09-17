import type { VisitorVM } from '../model';

export interface ActivityFunnelStage {
  id: string;
  label: string;
  value: number;
  detail: string;
  tone?: 'default' | 'paid' | 'warning' | 'danger';
}

/** Nested current-state criteria, not a historical event-conversion sequence. */
export function getActivityFunnelStages(
  visitors: VisitorVM[],
  now: string,
  rangeDays: number,
): ActivityFunnelStage[] {
  const end = new Date(now).getTime();
  const cutoff = end - rangeDays * 86400000;
  let evaluated = 0;
  let visits = 0;
  let paidVisitors = 0;
  let paidVisits = 0;
  let atRisk = 0;
  let thresholdCrossed = 0;
  const decisions = { blocked: 0, pending: 0, failed: 0 };

  for (const visitor of visitors) {
    const visitsInRange = visitor.visits.filter((visit) => {
      const at = new Date(visit.startedAt).getTime();
      return at >= cutoff && at <= end;
    });
    if (!visitsInRange.length) continue;
    evaluated += 1;
    const paidVisitsInRange = visitsInRange.filter((visit) => visit.source === 'paid');
    visits += visitsInRange.length;
    if (paidVisitsInRange.length === 0) continue;
    paidVisitors += 1;
    paidVisits += paidVisitsInRange.length;
    if (visitor.riskScore < 40) continue;
    atRisk += 1;
    if (visitor.riskScore < visitor.threshold) continue;
    thresholdCrossed += 1;
    if (visitor.status === 'blocked' || visitor.status === 'pending' || visitor.status === 'failed')
      decisions[visitor.status] += 1;
  }

  return [
    {
      id: 'evaluated',
      label: 'Evaluated',
      value: evaluated,
      detail: `${visits.toLocaleString()} visits in the selected range. Filters select a visitor cohort.`,
    },
    {
      id: 'paid',
      label: 'Paid traffic',
      value: paidVisitors,
      detail: `${paidVisits.toLocaleString()} paid clicks in the selected range, across the selected visitors' platforms.`,
      tone: 'paid',
    },
    {
      id: 'risk',
      label: 'At risk',
      value: atRisk,
      detail: 'Paid visitors with a current risk score of 40 or higher.',
      tone: 'warning',
    },
    {
      id: 'threshold',
      label: 'Threshold met',
      value: thresholdCrossed,
      detail: 'At-risk visitors whose current score meets their policy threshold.',
      tone: 'danger',
    },
    {
      id: 'blocked',
      label: 'Block decision',
      value: decisions.blocked + decisions.pending + decisions.failed,
      detail:
        `${decisions.blocked} blocked · ${decisions.pending} pending · ${decisions.failed} failed. ` +
        'A decision does not guarantee a completed platform exclusion.',
      tone: 'danger',
    },
  ];
}

export function getFunnelMetrics(stages: ActivityFunnelStage[]) {
  const baseline = stages[0]?.value ?? 0;
  return stages.map((stage, index) => {
    const previous = stages[index - 1]?.value ?? 0;
    return {
      ...stage,
      share: baseline > 0 ? stage.value / baseline : null,
      continuation: index > 0 && previous > 0 ? stage.value / previous : null,
    };
  });
}

/** Equal stage widths; only the height encodes quantity. */
export function getFunnelProfile(shares: (number | null)[], height = 72, width = 1000) {
  if (!shares.length) return { line: '', area: '' };
  const stageWidth = width / shares.length;
  const points = shares.flatMap((share, index) => {
    const y = Number((height * (1 - Math.max(0, Math.min(1, share ?? 0)))).toFixed(2));
    const left = Number((stageWidth * (index + (index === 0 ? 0 : 0.12))).toFixed(2));
    const right = Number((stageWidth * (index + (index === shares.length - 1 ? 1 : 0.88))).toFixed(2));
    return [`${left},${y}`, `${right},${y}`];
  });
  const line = `M${points.join(' L')}`;
  return { line, area: `${line} L${width},${height} L0,${height} Z` };
}

export function formatFunnelPercent(share: number | null) {
  return share === null ? '—' : `${(share * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}
