import type { VisitVM, VisitorVM } from '../model';

export function buildDecisionRoute({
  visits: input,
  blockedAtVisitId,
  exclusions,
  allowedBy,
  threshold,
  status,
}: Pick<VisitorVM, 'visits' | 'blockedAtVisitId' | 'exclusions' | 'allowedBy' | 'threshold' | 'status'>) {
  const visits = [...input].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  if (!visits.length) return [];
  const first = visits[0];
  const last = visits.at(-1)!;
  const triggerIndex = visits.findIndex((visit) => visit.id === blockedAtVisitId);
  const trigger = visits[triggerIndex];
  const peak = visits.reduce((best, visit) => (visit.scoreAfter > best.scoreAfter ? visit : best));
  const time = (at: string) =>
    new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const source = (visit: VisitVM) =>
    visit.source === 'paid'
      ? `Paid · ${visitSource(visit)}`
      : visit.source === 'direct'
        ? 'Direct'
        : visit.source === 'referral'
          ? 'Referral'
          : 'Organic search';
  const nodes: Array<{ icon: string; title: string; sub: string; prospective?: boolean }> = [
    {
      icon: '○',
      title: `First seen · ${time(first.startedAt)}`,
      sub: `${source(first)} → ${first.landingPath} · score ${first.scoreAfter}`,
    },
  ];
  const middle = visits.slice(1, triggerIndex >= 0 ? triggerIndex : -1);
  if (middle.length) {
    const end = middle.at(-1)!.scoreAfter;
    const delta = end - first.scoreAfter;
    nodes.push({
      icon: '●',
      title: delta > 0 ? 'Risk climbing' : delta < 0 ? 'Risk falling' : 'Risk steady',
      sub: `${middle.length} ${middle.length === 1 ? 'visit' : 'visits'} · score ${first.scoreAfter} → ${end}`,
    });
  }
  if (trigger)
    nodes.push({
      icon: '◆',
      title: `Threshold crossed · visit ${triggerIndex + 1}`,
      sub: `score ${trigger.scoreBefore} → ${trigger.scoreAfter} · threshold ${threshold}`,
    });
  const excluded = exclusions.filter((row) => row.state === 'excluded');
  if (excluded.length)
    nodes.push({
      icon: '⛨',
      title: 'Excluded from ads',
      sub: excluded
        .map(
          (row) =>
            ({ google_ads: 'Google Ads', meta_ads: 'Meta Ads', microsoft_ads: 'Microsoft Ads' })[
              row.platform
            ],
        )
        .join(', '),
    });
  if (allowedBy)
    nodes.push({
      icon: '✓',
      title: `Allowed · ${time(allowedBy.at)}`,
      sub: `${allowedBy.user}${allowedBy.note ? ` · “${allowedBy.note}”` : ''}`,
    });
  if (visits.length > 1)
    nodes.push({
      icon: '○',
      title: `Last seen · ${time(last.startedAt)}`,
      sub: `${source(last)} → ${last.landingPath}${last.afterBlock ? ' · after block' : ''}`,
    });
  if (!trigger && status === 'monitoring') {
    nodes.push({
      icon: '◇',
      title: `Closest to threshold · peaked at ${peak.scoreAfter} on visit ${visits.indexOf(peak) + 1}`,
      sub: time(peak.startedAt),
    });
    nodes.push({
      icon: '○',
      title: visits.some((visit) => visit.source === 'paid')
        ? `Would block if risk reaches ${threshold}`
        : 'Would block on its first paid click',
      sub: 'No block decision recorded',
      prospective: true,
    });
  }
  return nodes;
}

export type StoryTone = 'neutral' | 'risk' | 'good' | 'warning';
export interface JourneyChapter {
  id: string;
  title: string;
  detail: string;
  visitId: string;
  at: string;
  tone: StoryTone;
  kind: 'arrival' | 'pattern' | 'decision' | 'after' | 'conversion' | 'allowed' | 'monitoring';
}

export const visitSource = (visit: VisitVM) =>
  visit.source === 'paid'
    ? visit.platform
      ? { google_ads: 'Google Ads', meta_ads: 'Meta Ads', microsoft_ads: 'Microsoft Ads' }[visit.platform]
      : 'Paid traffic'
    : { organic: 'Organic search', direct: 'Direct traffic', referral: 'Referral traffic' }[visit.source];

export function journeySpan(first: string, last: string) {
  const minutes = Math.max(0, Math.round((Date.parse(last) - Date.parse(first)) / 60000));
  if (!minutes) return 'less than a minute';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
    : `${Math.floor(hours / 24)}d${hours % 24 ? ` ${hours % 24}h` : ''}`;
}

export function buildJourneyNarrative(visitor: VisitorVM) {
  const visits = [...visitor.visits].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const first = visits[0];
  const last = visits.at(-1);
  const decisionIndex = visits.findIndex((visit) => visit.id === visitor.blockedAtVisitId);
  const decision = visits[decisionIndex];
  const after = decision ? visits.slice(decisionIndex + 1) : [];
  const paid = visits.filter((visit) => visit.source === 'paid').length;
  const paidThroughDecision = decision
    ? visits.slice(0, decisionIndex + 1).filter((visit) => visit.source === 'paid').length
    : paid;
  const afterPaid = after.filter((visit) => visit.source === 'paid').length;
  const conversions = visits.filter((visit) => visit.conversion).length;
  const noInteraction = visits.filter(
    (visit) => visit.jsExecuted && visit.interaction.level === 'none',
  ).length;
  const headlines = {
    blocked: decision
      ? `A block decision after ${paidThroughDecision} paid ${paidThroughDecision === 1 ? 'visit' : 'visits'}.`
      : 'Ad exclusions are active.',
    failed: 'A block decision. Protection is incomplete.',
    pending: 'A block decision. Ad exclusions are still syncing.',
    allowed: 'Manually allowed to keep visiting.',
    monitoring: paid
      ? 'Risk is being monitored. No block decision yet.'
      : 'Unpaid activity, with no ad spend to exclude.',
    clean: conversions ? 'A conversion recorded along the way.' : 'Visits recorded. No block decision.',
  };
  const chapters: JourneyChapter[] = [];
  if (first && last) {
    chapters.push({
      id: 'arrival',
      kind: 'arrival',
      title: `Arrived via ${visitSource(first)}`,
      detail: `${first.landingPath} · initial risk ${first.scoreAfter}`,
      visitId: first.id,
      at: first.startedAt,
      tone: 'neutral',
    });
    const converted = [...visits].reverse().find((visit) => visit.conversion);
    const beforeOutcome = converted ? visits.indexOf(converted) : visits.length - 1;
    const buildup =
      decisionIndex > 1
        ? visits.slice(0, decisionIndex)
        : !decision && beforeOutcome > 1
          ? visits.slice(0, beforeOutcome)
          : [];
    if (buildup.length) {
      const peak = buildup.reduce((best, visit) => (visit.scoreAfter > best.scoreAfter ? visit : best));
      chapters.push({
        id: 'pattern',
        kind: 'pattern',
        title: `Risk reached ${peak.scoreAfter}`,
        detail:
          `${buildup.length} visits${decision ? ' before the decision' : ' recorded'} · ` +
          `${buildup.filter((visit) => visit.source === 'paid').length} paid`,
        visitId: peak.id,
        at: peak.startedAt,
        tone: peak.scoreAfter >= visitor.threshold ? 'risk' : 'warning',
      });
    }
    if (decision)
      chapters.push({
        id: 'decision',
        kind: 'decision',
        title: `Block decision at visit ${decisionIndex + 1}`,
        detail: `Risk ${decision.scoreBefore} → ${decision.scoreAfter} · threshold ${visitor.threshold}`,
        visitId: decision.id,
        at: decision.startedAt,
        tone: 'risk',
      });
    if (visitor.allowedBy) {
      chapters.push({
        id: 'allowed',
        kind: 'allowed',
        title: `Allowed by ${visitor.allowedBy.user}`,
        detail: visitor.allowedBy.note ?? 'Manual allowance is active',
        visitId: last.id,
        at: visitor.allowedBy.at,
        tone: 'neutral',
      });
    } else if (after.length) {
      chapters.push({
        id: 'after',
        kind: 'after',
        title: `${after.length} ${after.length === 1 ? 'visit' : 'visits'} after the decision`,
        detail: `${afterPaid} paid · ${after.length - afterPaid} unpaid returns`,
        visitId: last.id,
        at: last.startedAt,
        tone: afterPaid ? 'warning' : 'neutral',
      });
    } else if (!decision) {
      chapters.push(
        converted
          ? {
              id: 'conversion',
              kind: 'conversion',
              title: `${converted.conversion!.type} recorded`,
              detail:
                converted.conversion!.value !== undefined
                  ? `$${converted.conversion!.value.toFixed(2)} conversion value`
                  : 'Conversion observed on this visit',
              visitId: converted.id,
              at: converted.startedAt,
              tone: 'good',
            }
          : {
              id: 'latest',
              kind: 'monitoring',
              title: visitor.status === 'monitoring' ? 'Still monitoring' : 'Latest recorded visit',
              detail: `Risk ${last.scoreAfter} · ${paid ? 'no block decision' : 'no paid visits'}`,
              visitId: last.id,
              at: last.startedAt,
              tone: 'neutral',
            },
      );
    }
  }
  return {
    visits,
    first,
    last,
    decision,
    decisionIndex,
    paid,
    afterPaid,
    after,
    conversions,
    noInteraction,
    chapters,
    headline: headlines[visitor.status],
    span: first && last ? journeySpan(first.startedAt, last.startedAt) : '—',
    totalDuration: visits.reduce((sum, visit) => sum + visit.durationMs, 0),
  };
}

export function describeJourneyVisit(visit: VisitVM, visitor: VisitorVM) {
  const decision = visit.id === visitor.blockedAtVisitId;
  const delta = visit.scoreAfter - visit.scoreBefore;
  const behavior = !visit.jsExecuted
    ? 'Behavior unavailable'
    : visit.interaction.level === 'none'
      ? 'No interaction recorded'
      : `${visit.interaction.scrollPct}% scroll · ${visit.interaction.clicks} ${visit.interaction.clicks === 1 ? 'click' : 'clicks'}`;
  const title = decision
    ? 'The visit that triggered a block decision'
    : visit.conversion
      ? `A ${visit.conversion.type} was recorded`
      : visit.afterBlock
        ? `${visit.source === 'paid' ? 'A paid visit' : 'An unpaid return'} after the decision`
        : !visit.jsExecuted
          ? 'A visit with no recorded behavior'
          : visit.interaction.level === 'none'
            ? 'Arrived, with no interaction recorded'
            : 'Arrived and interacted with the site';
  const result = decision
    ? 'Block decision'
    : visit.conversion
      ? 'Conversion recorded'
      : delta < 0
        ? 'Risk decreased'
        : delta > 0
          ? 'Risk increased'
          : 'Risk unchanged';
  return {
    decision,
    delta,
    behavior,
    title,
    result,
    tone: decision
      ? ('risk' as const)
      : visit.conversion || delta < 0
        ? ('good' as const)
        : ('neutral' as const),
  };
}

// Summarize recorded events only; this is not a fabricated screen/session replay.
export function keyRecordedEvents(visit: VisitVM) {
  if (!visit.jsExecuted) return [];
  const ordered = [...visit.events].sort((a, b) => a.t - b.t);
  if (ordered.length <= 4) return ordered;
  const priority = (kind: string) =>
    ({ conversion: 5, form_submit: 4, signal: 3, click: 2, scroll: 1 })[kind] ?? 0;
  const middle = ordered
    .slice(1, -1)
    .map((event, index) => ({ event, index: index + 1 }))
    .sort((a, b) => priority(b.event.kind) - priority(a.event.kind) || a.index - b.index)
    .slice(0, 2);
  const selected = new Set([0, ordered.length - 1, ...middle.map((item) => item.index)]);
  return ordered.filter((_, index) => selected.has(index));
}
