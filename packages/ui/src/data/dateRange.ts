import type { VisitorVM } from '../model';

/** A range-scoped view; current enforcement and recorded scores are not rewritten. */
export function getVisitorsInRange(visitors: VisitorVM[], now: string, days: number): VisitorVM[] {
  const end = Date.parse(now);
  const start = end - days * 86400000;
  return visitors.flatMap((visitor) => {
    const visits = visitor.visits.filter((visit) => {
      const at = Date.parse(visit.startedAt);
      return at >= start && at <= end;
    });
    if (!visits.length) return [];
    const paid = visits.filter((visit) => visit.source === 'paid');
    const preBlock = paid.filter((visit) => !visitor.blockedAt || visit.startedAt <= visitor.blockedAt);
    const wastedSpend = preBlock.reduce((total, visit) => total + (visit.cpc ?? 0), 0);
    return [
      {
        ...visitor,
        visits,
        lastSeen: visits.at(-1)!.startedAt,
        paidVisits: paid.length,
        unpaidVisits: visits.length - paid.length,
        paidVisitsBeforeBlock: preBlock.length,
        wastedSpend,
        // Keep the existing estimate/cap and manual-action history; never invent savings.
        protectedSpendEst: Math.min(visitor.protectedSpendEst, wastedSpend * 2.05),
      },
    ];
  });
}
