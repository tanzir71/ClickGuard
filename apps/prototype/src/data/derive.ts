import type { VisitorVM } from '@clickguard/ui';
import { SIGNAL_LABELS } from './scoring';
import type { DataSet, SignalHit, Visit, Visitor } from './types';

const severityRank: Record<Visitor['status'], number> = { failed: 6, pending: 5, blocked: 4, monitoring: 3, allowed: 2, clean: 1 };
const levelRank = { none: 0, low: 1, medium: 2, high: 3 } as const;

function modeInteraction(visits: Visit[]) {
  const counts = { none: 0, low: 0, medium: 0, high: 0 }; visits.forEach((visit) => { counts[visit.interaction.level] += 1; });
  return (Object.keys(counts) as Array<keyof typeof counts>).sort((a, b) => counts[b] - counts[a] || levelRank[a] - levelRank[b])[0];
}

function aggregateSignals(visits: Visit[]) {
  const map = new Map<string, SignalHit>();
  for (const signal of visits.flatMap((visit) => visit.signals)) { const current = map.get(signal.signalId); if (!current || Math.abs(signal.points) > Math.abs(current.points)) map.set(signal.signalId, { ...signal }); }
  return [...map.values()].sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
}

function verdict(visitor: Visitor, visits: Visit[], paid: number, topSignals: SignalHit[]) {
  const top = topSignals.filter((signal) => signal.points > 0).slice(0, 2).map((signal) => SIGNAL_LABELS[signal.signalId].toLowerCase()).join(' and '); const mitigating = topSignals.find((signal) => signal.points < 0);
  const triggerIndex = Math.max(0, visits.findIndex((visit) => visit.id === visitor.blockedAtVisitId)) + 1; const when = visitor.blockedAt ? new Date(visitor.blockedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  if (visitor.status === 'blocked') return `Blocked on ${when} after visit ${triggerIndex} of ${visits.length}: ${top || 'the cumulative risk pattern crossed the threshold'}.`;
  if (visitor.status === 'pending') return `Blocking now: the score crossed ${visitor.threshold} at visit ${triggerIndex}, and exclusions are syncing to connected ad platforms.`;
  if (visitor.status === 'failed') return `We blocked this visitor at visit ${triggerIndex}, but an ad platform rejected the exclusion. Review the campaign limit to stop more paid clicks.`;
  if (visitor.status === 'allowed') return `Always allowed by ${visitor.allowedBy?.user ?? 'your team'} on ${visitor.allowedBy ? new Date(visitor.allowedBy.at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}. We would have blocked it at a score of ${visitor.riskScore}.`;
  if (visitor.status === 'monitoring' && paid === 0) return `Suspicious, but there’s nothing to block: this visitor has never clicked your ads, so no ad spend is at risk.`;
  if (visitor.status === 'monitoring') return `Not blocked. Risk is ${visitor.riskScore}, ${visitor.threshold - visitor.riskScore} points under the threshold: ${top || 'some risk signals'}${mitigating ? `, but ${SIGNAL_LABELS[mitigating.signalId].toLowerCase()} lowers the score` : ''}.`;
  return `Looks like a real visitor: ${visits.length} ${visits.length === 1 ? 'visit' : 'visits'} with normal behavior${visits.some((visit) => visit.converted) ? ' and a conversion' : ''}.`;
}

export function deriveVisitors(data: DataSet): VisitorVM[] {
  const visitsByIp = new Map<string, Visit[]>(); data.visits.forEach((visit) => visitsByIp.set(visit.ip, [...(visitsByIp.get(visit.ip) ?? []), visit]));
  return data.visitors.map((visitor) => {
    const visits = (visitsByIp.get(visitor.ip) ?? []).sort((a, b) => a.startedAt.localeCompare(b.startedAt)); const paidVisits = visits.filter((visit) => visit.source === 'paid'); const unpaidVisits = visits.length - paidVisits.length;
    const preBlockPaid = paidVisits.filter((visit) => !visitor.blockedAt || visit.startedAt <= visitor.blockedAt); const wastedSpend = preBlockPaid.reduce((sum, visit) => sum + (visit.cpc ?? 0), 0); const topSignals = aggregateSignals(visits);
    const bots = visits.map((visit) => visit.botProbability); const converted = visits.filter((visit) => visit.converted); const forms = visits.map((visit) => visit.formFill?.deliverability).filter(Boolean);
    const recencyHours = Math.max(0, (new Date('2026-09-17T14:00:00Z').getTime() - new Date(visitor.lastSeen).getTime()) / 3600000); const recency = Math.max(0, 100 - recencyHours);
    return {
      ip: visitor.ip, city: visitor.geo.city, region: visitor.geo.region, country: visitor.geo.country || undefined, isp: visitor.asnName ?? visitor.isp, asn: visitor.asn, networkType: visitor.networkType,
      deviceCount: visitor.fingerprints.length, firstSeen: visitor.firstSeen, lastSeen: visitor.lastSeen, status: visitor.status, reviewed: visitor.reviewed, riskScore: visitor.riskScore, threshold: visitor.threshold,
      blockedAt: visitor.blockedAt, blockedAtVisitId: visitor.blockedAtVisitId, decisionBy: visitor.decision?.by === 'auto' ? 'Auto' : visitor.decision?.by.user, exclusions: visitor.exclusions,
      allowedBy: visitor.allowedBy, visits: visits.map((visit) => ({ id: visit.id, startedAt: visit.startedAt, durationMs: visit.durationMs, source: visit.source, platform: visit.platform, campaign: visit.campaign,
        adGroup: visit.adGroup, keyword: visit.keyword, clickId: visit.gclid ?? visit.fbclid, cpc: visit.cpc, landingPath: visit.landingPath, landingUrl: visit.landingUrl, interaction: { level: visit.interaction.level, scrollPct: visit.interaction.scrollPct, clicks: visit.interaction.clicks, pointerMoves: visit.interaction.pointerMoves }, botProbability: visit.botProbability, vpnProxy: visit.vpnProxy,
        formFill: visit.formFill, conversion: visit.converted ? { type: visit.conversionType ?? 'conversion', value: visit.conversionValue } : undefined, jsExecuted: visit.jsExecuted, events: visit.events, activityBuckets: visit.activityBuckets,
        signals: visit.signals.map((signal) => ({ id: signal.signalId, label: SIGNAL_LABELS[signal.signalId], value: signal.value, points: signal.points, severity: signal.severity })), scoreBefore: visit.scoreBefore, scoreAfter: visit.scoreAfter, afterBlock: visit.afterBlock, device: visit.device })),
      paidVisits: paidVisits.length, unpaidVisits, paidVisitsBeforeBlock: preBlockPaid.length, wastedSpend, protectedSpendEst: visitor.status === 'blocked' ? Math.min(280, wastedSpend * 2.05) : 0,
      topSignals: topSignals.map((signal) => ({ id: signal.signalId, label: SIGNAL_LABELS[signal.signalId], value: signal.value, points: signal.points, severity: signal.severity })),
      maxBotProbability: bots.length ? Math.max(...bots) : 0, avgBotProbability: bots.length ? bots.reduce((sum, value) => sum + value, 0) / bots.length : 0, typicalInteraction: modeInteraction(visits), vpnProxyAny: visits.some((visit) => visit.vpnProxy),
      conversions: converted.length, conversionValueTotal: converted.reduce((sum, visit) => sum + (visit.conversionValue ?? 0), 0), formFills: { valid: forms.filter((value) => value === 'valid').length, invalid: forms.filter((value) => value === 'invalid').length, disposable: forms.filter((value) => value === 'disposable').length },
      priority: (visitor.scenario ? 40000 - Number(visitor.scenario.slice(1)) * 1000 : 0) + severityRank[visitor.status] * 1000 + Math.min(wastedSpend, 99) * 5 + recency, needsReview: visitor.status === 'monitoring' || visitor.status === 'failed' || (visitor.status === 'blocked' && !visitor.reviewed && recencyHours <= 24),
      verdict: verdict(visitor, visits, paidVisits.length, topSignals), related: { sameFingerprintIps: visitor.related.sameFingerprintIps.length, subnet24Ips: visitor.related.subnet24Ips.length, asnVisitorCount: visitor.related.asnVisitorCount, asnBlockedCount: visitor.related.asnBlockedCount, networkBlockedAccounts30d: visitor.networkBlockedAccounts30d },
    } satisfies VisitorVM;
  }).sort((a, b) => b.priority - a.priority);
}
