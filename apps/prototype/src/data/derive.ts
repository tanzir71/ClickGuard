import { verdict } from './verdict';
import { platforms } from './account';
import type { SignalVM, VisitorVM } from '@clickguard/ui';
import { SIGNAL_LABELS } from './scoring';
import type { DataSet, SignalHit, Visit, Visitor } from './types';

const severityRank: Record<Visitor['status'], number> = {
  failed: 6,
  pending: 5,
  blocked: 4,
  monitoring: 3,
  allowed: 2,
  clean: 1,
};
const levelRank = { none: 0, low: 1, medium: 2, high: 3 } as const;

function modeInteraction(visits: Visit[]) {
  const counts = { none: 0, low: 0, medium: 0, high: 0 };
  visits.forEach((visit) => {
    counts[visit.interaction.level] += 1;
  });
  return (Object.keys(counts) as Array<keyof typeof counts>).sort(
    (a, b) => counts[b] - counts[a] || levelRank[a] - levelRank[b],
  )[0];
}

function aggregateSignals(visits: Visit[]) {
  const map = new Map<string, SignalVM>();
  for (const visit of visits)
    for (const step of visit.scoreSteps) {
      const existing = map.get(step.signalId);
      const points = (existing?.points ?? 0) + step.points;
      map.set(step.signalId, {
        id: step.signalId,
        label: step.label,
        points,
        severity: Math.abs(points) >= 18 ? 'high' : Math.abs(points) >= 8 ? 'med' : 'low',
        value: visit.signals.find((signal) => signal.signalId === step.signalId)?.value ?? step.reason ?? '',
      });
    }
  return [...map.values()]
    .filter((signal) => signal.points !== 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
}

export function deriveVisitors(data: DataSet): VisitorVM[] {
  const visitsByIp = new Map<string, Visit[]>();
  data.visits.forEach((visit) => visitsByIp.set(visit.ip, [...(visitsByIp.get(visit.ip) ?? []), visit]));
  return data.visitors
    .map((visitor) => {
      const visits = (visitsByIp.get(visitor.ip) ?? []).sort((a, b) =>
        a.startedAt.localeCompare(b.startedAt),
      );
      const paidVisits = visits.filter((visit) => visit.source === 'paid');
      const unpaidVisits = visits.length - paidVisits.length;
      const preBlockPaid = paidVisits.filter(
        (visit) => !visitor.blockedAt || visit.startedAt <= visitor.blockedAt,
      );
      const wastedSpend = preBlockPaid.reduce((sum, visit) => sum + (visit.cpc ?? 0), 0);
      const topSignals = aggregateSignals(visits);
      const bots = visits.map((visit) => visit.botProbability);
      const converted = visits.filter((visit) => visit.converted);
      const forms = visits.map((visit) => visit.formFill?.deliverability).filter(Boolean);
      const recencyHours = Math.max(
        0,
        (new Date('2026-09-17T14:00:00Z').getTime() - new Date(visitor.lastSeen).getTime()) / 3600000,
      );
      const recency = Math.max(0, 100 - recencyHours);
      return {
        ip: visitor.ip,
        city: visitor.geo.city,
        region: visitor.geo.region,
        country: visitor.geo.country || undefined,
        isp: visitor.asnName ?? visitor.isp,
        asn: visitor.asn,
        networkType: visitor.networkType,
        deviceCount: visitor.fingerprints.length,
        firstSeen: visitor.firstSeen,
        lastSeen: visitor.lastSeen,
        status: visitor.status,
        reviewed: visitor.reviewed,
        riskScore: visitor.riskScore,
        threshold: visitor.threshold,
        blockedAt: visitor.blockedAt,
        blockedAtVisitId: visitor.blockedAtVisitId,
        decisionBy: visitor.decision?.by === 'auto' ? 'Auto' : visitor.decision?.by.user,
        exclusions:
          visitor.status === 'clean'
            ? []
            : platforms.map((platform) => {
                if (!data.account.connectedPlatforms.includes(platform))
                  return { platform, state: 'not_connected' as const };
                const recorded = visitor.exclusions.find(
                  (row) => row.platform === platform && row.state !== 'not_connected',
                );
                return (
                  recorded ?? {
                    platform,
                    state: visitor.status === 'allowed' ? ('removed' as const) : ('if_blocked' as const),
                  }
                );
              }),
        allowedBy: visitor.allowedBy,
        visits: visits.map((visit) => ({
          id: visit.id,
          startedAt: visit.startedAt,
          durationMs: visit.durationMs,
          source: visit.source,
          platform: visit.platform,
          campaign: visit.campaign,
          adGroup: visit.adGroup,
          keyword: visit.keyword,
          clickId: visit.gclid ?? visit.fbclid,
          cpc: visit.cpc,
          landingPath: visit.landingPath,
          landingUrl: visit.landingUrl,
          interaction: {
            level: visit.interaction.level,
            scrollPct: visit.interaction.scrollPct,
            clicks: visit.interaction.clicks,
            pointerMoves: visit.interaction.pointerMoves,
          },
          botProbability: visit.botProbability,
          vpnProxy: visit.vpnProxy,
          formFill: visit.formFill,
          conversion: visit.converted
            ? { type: visit.conversionType ?? 'conversion', value: visit.conversionValue }
            : undefined,
          jsExecuted: visit.jsExecuted,
          events: visit.events,
          activityBuckets: visit.activityBuckets,
          scoreSteps: visit.scoreSteps,
          signals: visit.signals.map((signal) => ({
            id: signal.signalId,
            label: SIGNAL_LABELS[signal.signalId],
            value: signal.value,
            points: signal.points,
            severity: signal.severity,
          })),
          scoreBefore: visit.scoreBefore,
          scoreAfter: visit.scoreAfter,
          afterBlock: visit.afterBlock,
          device: visit.device,
        })),
        paidVisits: paidVisits.length,
        unpaidVisits,
        paidVisitsBeforeBlock: preBlockPaid.length,
        wastedSpend,
        protectedSpendEst: visitor.status === 'blocked' ? Math.min(280, wastedSpend * 2.05) : 0,
        topSignals,
        maxBotProbability: bots.length ? Math.max(...bots) : 0,
        avgBotProbability: bots.length ? bots.reduce((sum, value) => sum + value, 0) / bots.length : 0,
        typicalInteraction: modeInteraction(visits),
        vpnProxyAny: visits.some((visit) => visit.vpnProxy),
        conversions: converted.length,
        conversionValueTotal: converted.reduce((sum, visit) => sum + (visit.conversionValue ?? 0), 0),
        formFills: {
          valid: forms.filter((value) => value === 'valid').length,
          invalid: forms.filter((value) => value === 'invalid').length,
          disposable: forms.filter((value) => value === 'disposable').length,
        },
        priority:
          (visitor.scenario ? 40000 - Number(visitor.scenario.slice(1)) * 1000 : 0) +
          severityRank[visitor.status] * 1000 +
          Math.min(wastedSpend, 99) * 5 +
          recency,
        needsReview:
          visitor.status === 'monitoring' ||
          visitor.status === 'failed' ||
          (visitor.status === 'blocked' && !visitor.reviewed && recencyHours <= 24),
        verdict: verdict(
          visitor,
          visits,
          topSignals
            .filter((signal) => signal.id in SIGNAL_LABELS)
            .map((signal) => ({ ...signal, signalId: signal.id as SignalHit['signalId'] })),
          data.account.timeZone,
        ),
        related: {
          sameFingerprintIps: visitor.related.sameFingerprintIps.length,
          subnet24Ips: visitor.related.subnet24Ips.length,
          asnVisitorCount: visitor.related.asnVisitorCount,
          asnBlockedCount: visitor.related.asnBlockedCount,
          networkBlockedAccounts30d: visitor.networkBlockedAccounts30d,
        },
      } satisfies VisitorVM;
    })
    .sort((a, b) => b.priority - a.priority);
}
