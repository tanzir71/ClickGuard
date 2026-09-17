import type { ScoreStep } from '@clickguard/ui';
import type { DataSet, SignalHit, SignalId, Visit, Visitor } from './types';
import { clamp } from './seed';

export const SIGNAL_LABELS: Record<SignalHit['signalId'], string> = {
  bot_probability: 'Likely automated', interaction_none: 'No real interaction', interaction_low: 'Minimal interaction', vpn_proxy: 'VPN or proxy',
  form_invalid_email: 'Undeliverable email', location_outside_targeting: 'Outside targeting', click_frequency: 'Click burst', datacenter_ip: 'Data-center network',
  timezone_mismatch: 'Timezone mismatch', device_spoofing: 'Device spoofing', fingerprint_rotation: 'Device rotation', gclid_reuse: 'Reused ad click ID',
  gclid_missing: 'Missing ad click ID', click_cadence: 'Machine-like cadence', keyword_fixation: 'Keyword fixation', business_hours_competitor: 'Office-hours pattern',
  converted: 'Converted', form_valid_email: 'Valid email', interaction_high: 'Real engagement', shared_ip: 'Shared IP', returning_organic: 'Organic return',
  no_js: 'No JavaScript', quick_back: 'Quick back', human_friction: 'Human frustration', network_intel: 'Network intelligence',
};

export function scoreSignals(signals: SignalHit[]) { return clamp(signals.reduce((sum, signal) => sum + signal.points, 0)); }
export function riskBand(score: number, threshold = 70) { return score >= threshold ? 'High' : score >= 40 ? 'Elevated' : 'Low'; }

export const SIGNAL_CAPS: Record<SignalId, number> = {
  bot_probability: 30, interaction_none: 18, interaction_low: 8, vpn_proxy: 12,
  form_invalid_email: 20, location_outside_targeting: 10, click_frequency: 25, datacenter_ip: 22,
  timezone_mismatch: 10, device_spoofing: 15, fingerprint_rotation: 15, gclid_reuse: 20,
  gclid_missing: 8, click_cadence: 15, keyword_fixation: 10, business_hours_competitor: 8,
  converted: 25, form_valid_email: 10, interaction_high: 18, shared_ip: 10, returning_organic: 5,
  no_js: 16, quick_back: 9, human_friction: 8, network_intel: 10,
};
const additive = new Set<SignalId>(['interaction_none', 'interaction_low', 'interaction_high', 'no_js', 'quick_back', 'human_friction']);
const hit = (signalId: SignalId, points: number, value: string): SignalHit => ({ signalId, points, value, severity: Math.abs(points) >= 18 ? 'high' : Math.abs(points) >= 8 ? 'med' : 'low' });

/** Detectors consume observations, never target scores or scenario names. */
export function detectSignals(visitor: Visitor, visit: Visit, history: Visit[]): SignalHit[] {
  const signals: SignalHit[] = [];
  const add = (id: SignalId, points: number, value: string, condition = true) => { if (condition) signals.push(hit(id, points, value)); };
  const bot = visit.botProbability >= .9 ? 30 : visit.botProbability >= .7 ? 18 : visit.botProbability >= .5 ? 8 : 0;
  add('bot_probability', bot, `${Math.round(visit.botProbability * 100)}% likely automated`, bot > 0);
  add('interaction_none', 6, 'No scroll or pointer movement', visit.jsExecuted && visit.interaction.level === 'none' && visit.interaction.scrollPct === 0 && visit.interaction.pointerMoves === 0 && visit.durationMs < 2000);
  add('interaction_low', 2, 'Minimal interaction', visit.jsExecuted && visit.interaction.level === 'low');
  add('interaction_high', -6, 'Engaged for at least 30 seconds', visit.jsExecuted && visit.interaction.level === 'high' && visit.durationMs >= 30000 && visit.interaction.scrollPct >= 50);
  add('vpn_proxy', 12, 'VPN or proxy observed', visit.vpnProxy);
  add('datacenter_ip', 22, visitor.asnName ?? 'Data-center network', visitor.networkType === 'datacenter');
  add('network_intel', 10, `${visitor.networkBlockedAccounts30d} other accounts`, visitor.networkBlockedAccounts30d >= 5);
  const paid = [...history, visit].filter((item) => item.source === 'paid');
  const time = Date.parse(visit.startedAt);
  const inHour = paid.filter((item) => time - Date.parse(item.startedAt) <= 3600000).length;
  const inDay = paid.filter((item) => time - Date.parse(item.startedAt) <= 86400000).length;
  const frequency = inHour >= 5 ? 25 : inHour >= 3 ? 12 : inDay >= 3 ? 8 : 0;
  add('click_frequency', frequency, `${inHour} paid in 1 hour · ${inDay} in 24 hours`, visit.source === 'paid' && frequency > 0);
  const clickId = visit.gclid ?? visit.fbclid;
  add('gclid_reuse', 20, 'Ad click ID seen on an earlier visit', !!clickId && history.some((item) => (item.gclid ?? item.fbclid) === clickId));
  add('gclid_missing', 8, 'Paid landing without a click ID', visit.source === 'paid' && !clickId);
  if (visit.source === 'paid' && paid.length >= 4) {
    const gaps = paid.slice(1).map((item, index) => Date.parse(item.startedAt) - Date.parse(paid[index].startedAt));
    const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const deviation = Math.sqrt(gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length);
    add('click_cadence', 15, 'Paid-click gap variation under 5%', mean > 0 && deviation / mean < .05);
    const same = paid.filter((item) => item.keyword === visit.keyword && item.landingPath === visit.landingPath);
    add('keyword_fixation', 10, 'Same high-cost keyword and landing page', same.length >= 4 && !!visit.keyword && (visit.cpc ?? 0) >= 5);
  }
  add('form_invalid_email', visit.formFill?.deliverability === 'disposable' ? 15 : 20, 'Undeliverable form email', ['invalid', 'disposable'].includes(visit.formFill?.deliverability ?? ''));
  add('form_valid_email', -10, 'Deliverable form email', visit.formFill?.deliverability === 'valid');
  add('converted', -25, visit.conversionType ?? 'Conversion', !!visit.converted);
  const realDevices = new Set([...history, visit].filter((item) => item.jsExecuted && ['low', 'medium', 'high'].includes(item.interaction.level)).map((item) => item.fingerprint));
  add('shared_ip', -10, `${realDevices.size} devices with human interaction`, realDevices.size >= 3);
  add('returning_organic', -5, 'Engaged unpaid return', ['organic', 'direct'].includes(visit.source) && history.length > 0 && visit.jsExecuted && ['medium', 'high'].includes(visit.interaction.level));
  add('no_js', 8, 'Tracking tag did not execute', visit.source === 'paid' && !visit.jsExecuted);
  add('quick_back', 3, 'Returned to the ad within three seconds', visit.source === 'paid' && visit.events.some((event) => event.kind === 'quick_back' && event.t <= 3000));
  add('human_friction', -4, 'Rage or dead clicks', visit.events.some((event) => ['rage_click', 'dead_click'].includes(event.kind)));
  const observed = visit.riskObservations;
  add('location_outside_targeting', 10, 'Outside campaign targeting', !!observed?.outsideTargeting);
  add('timezone_mismatch', 10, visit.device.timezone, !!observed?.timezoneMismatch);
  add('business_hours_competitor', 8, 'Business-network pattern detected', !!observed?.businessHoursPattern);
  add('device_spoofing', 15, 'Contradictory device attributes', !!observed?.deviceSpoofing);
  add('fingerprint_rotation', 15, 'Rapid fingerprint rotation detected', !!observed?.rotatingFingerprints);
  return signals;
}

export function applyVisitScore(before: number, signals: SignalHit[], counted: Map<SignalId, number>, inactiveDays = 0) {
  const scoreSteps: ScoreStep[] = [];
  const adjustments: ScoreStep[] = [];
  const periods = Math.floor(inactiveDays / 7);
  const decayed = periods ? Math.round(before * .85 ** periods) : before;
  if (decayed !== before) adjustments.push({ signalId: 'decay', label: 'Inactivity decay', reason: `${periods * 7} inactive days`, points: decayed - before });
  for (const signal of signals) {
    const already = counted.get(signal.signalId) ?? 0;
    const magnitude = Math.abs(signal.points);
    const remaining = Math.max(0, SIGNAL_CAPS[signal.signalId] - already);
    const applied = Math.min(remaining, additive.has(signal.signalId) ? magnitude : Math.max(0, magnitude - already));
    counted.set(signal.signalId, already + applied);
    scoreSteps.push({ signalId: signal.signalId, label: SIGNAL_LABELS[signal.signalId], points: Math.sign(signal.points) * applied,
      ...(applied !== magnitude ? { rawPoints: signal.points } : {}),
      reason: !applied ? 'cap reached' : applied < magnitude ? 'remaining category cap' : already ? 'additional occurrence' : 'first occurrence',
    });
  }
  scoreSteps.sort((a, b) => Number(a.points <= 0) - Number(b.points <= 0) || Number(a.points === 0) - Number(b.points === 0));
  scoreSteps.push(...adjustments);
  const unbounded = before + scoreSteps.reduce((sum, step) => sum + step.points, 0);
  const scoreAfter = clamp(unbounded);
  if (scoreAfter !== unbounded) scoreSteps.push({ signalId: 'score_limit', label: 'Score limit', reason: unbounded > 100 ? 'capped at 100' : 'floored at 0', points: scoreAfter - unbounded });
  return { scoreBefore: before, scoreAfter, scoreSteps };
}

/** One chronological pass owns score arithmetic, thresholds and the enforcement timeline. */
export function scoreDataSet(data: DataSet): DataSet {
  const allVisits: Visit[] = [];
  const visitors = data.visitors.map((input) => {
    const visitor = { ...input };
    const counted = new Map<SignalId, number>();
    const history: Visit[] = [];
    let score = 0; let decision: Visit | undefined;
    for (const inputVisit of data.visits.filter((visit) => visit.ip === visitor.ip).sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
      const visit = { ...inputVisit, events: inputVisit.events.filter((event) => event.kind !== 'signal') };
      const allowed = visitor.allowedBy && visit.startedAt >= visitor.allowedBy.at;
      visit.afterBlock = !!decision && !allowed;
      if (visit.afterBlock && visit.source === 'paid') {
        const failed = visitor.status === 'failed' && visitor.exclusions.some((row) => row.platform === visit.platform && row.state === 'failed');
        if (!failed) {
          visit.source = history.length % 2 ? 'organic' : 'direct';
          visit.platform = undefined; visit.cpc = undefined; visit.gclid = undefined; visit.fbclid = undefined;
          visit.campaign = undefined; visit.adGroup = undefined; visit.keyword = undefined; visit.matchType = undefined;
          visit.referrer = visit.source === 'organic' ? 'https://www.google.com/' : undefined;
          visit.landingUrl = `https://acme-shoes.com${visit.landingPath}`;
        }
      }
      visit.signals = detectSignals(visitor, visit, history);
      const inactiveDays = history.length ? (Date.parse(visit.startedAt) - Date.parse(history.at(-1)!.startedAt)) / 86400000 : 0;
      Object.assign(visit, applyVisitScore(score, visit.signals, counted, inactiveDays));
      score = visit.scoreAfter;
      if (!decision && !allowed && visit.source === 'paid' && score >= visitor.threshold) decision = visit;
      history.push(visit);
    }
    visitor.riskScore = score;
    visitor.firstSeen = history[0]?.startedAt ?? input.firstSeen;
    visitor.lastSeen = history.at(-1)?.startedAt ?? input.lastSeen;
    visitor.blockedAtVisitId = decision?.id;
    visitor.blockedAt = decision ? new Date(Date.parse(decision.startedAt) + 30000).toISOString() : undefined;
    visitor.decision = decision ? { by: 'auto', at: visitor.blockedAt!, rule: `score>=${visitor.threshold}` } : undefined;
    visitor.status = visitor.allowedBy ? 'allowed' : decision ? (['pending', 'failed'].includes(input.status) ? input.status : 'blocked') : score >= 40 || input.status === 'monitoring' ? 'monitoring' : 'clean';
    visitor.exclusions = visitor.allowedBy ? data.account.connectedPlatforms.map((platform) => ({ platform, state: 'removed', at: visitor.allowedBy!.at })) : decision ? data.account.connectedPlatforms.map((platform, index) => {
      const recorded = input.exclusions.find((row) => row.platform === platform);
      const state = recorded?.state === 'failed' ? 'failed' : recorded?.state === 'syncing' ? 'syncing' : 'excluded';
      return { platform, state, ...(state === 'excluded' ? { at: new Date(Date.parse(visitor.blockedAt!) + 30000 + index * 45000).toISOString() } : {}), ...(state === 'failed' ? { error: recorded?.error } : {}) };
    }) : [];
    allVisits.push(...history);
    return visitor;
  });
  return { ...data, visitors, visits: allVisits };
}
