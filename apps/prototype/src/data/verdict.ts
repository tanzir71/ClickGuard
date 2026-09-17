import { SIGNAL_LABELS } from './scoring';
import type { SignalHit, Visit, Visitor } from './types';

interface PhraseContext { visitor: Visitor; visits: Visit[]; signal: SignalHit }
const count = (n: number, singular: string, plural = `${singular}s`) => `${n} ${n === 1 ? singular : plural}`;
const sentenceCase = (text: string) => text ? text[0].toUpperCase() + text.slice(1) : text;
const paidWindow = (visits: Visit[]) => {
  const paid = visits.filter((visit) => visit.source === 'paid');
  if (paid.length < 2) return count(paid.length, 'paid click');
  const minutes = Math.max(1, Math.round((Date.parse(paid.at(-1)!.startedAt) - Date.parse(paid[0].startedAt)) / 60000));
  const span = minutes < 60 ? count(minutes, 'minute') : minutes < 1440 ? count(Math.ceil(minutes / 60), 'hour') : count(Math.ceil(minutes / 1440), 'day');
  return `${count(paid.length, 'paid click')} in ${span}`;
};

export const SIGNAL_PHRASES: Record<SignalHit['signalId'], (ctx: PhraseContext) => string> = {
  bot_probability: ({ visits }) => `${Math.round(Math.max(...visits.map((visit) => visit.botProbability)) * 100)}% likely automated`,
  click_frequency: ({ visits }) => paidWindow(visits),
  datacenter_ip: () => 'traffic from a data-center IP',
  interaction_none: () => 'visits with no scrolling or mouse movement',
  interaction_low: () => 'very little interaction with the site',
  vpn_proxy: ({ visits }) => visits.filter((visit) => visit.vpnProxy).length === 1 ? 'a VPN visit' : 'visits through a VPN or proxy',
  form_invalid_email: ({ visits }) => count(visits.filter((visit) => ['invalid', 'disposable'].includes(visit.formFill?.deliverability ?? '')).length, 'form fill with an undeliverable email', 'form fills with undeliverable emails'),
  location_outside_targeting: () => 'visits outside campaign targeting',
  timezone_mismatch: ({ visits }) => `a browser timezone (${visits.at(-1)?.device.timezone}) that differs from the IP location`,
  device_spoofing: () => 'device details that do not agree',
  fingerprint_rotation: () => 'rapidly changing device fingerprints',
  gclid_reuse: () => 'the same ad click ID reused',
  gclid_missing: () => 'a paid landing without an ad click ID',
  click_cadence: () => 'machine-regular intervals between paid clicks',
  keyword_fixation: () => 'repeat clicks on the same expensive keyword',
  business_hours_competitor: () => 'a business-network click pattern',
  converted: ({ visits }) => visits.some((visit) => visit.conversionType === 'purchase') ? 'a purchase was completed' : 'a conversion was recorded',
  form_valid_email: () => 'a form was submitted with a deliverable email',
  interaction_high: ({ visits }) => `real engagement on ${count(visits.filter((visit) => visit.interaction.level === 'high').length, 'visit')}`,
  shared_ip: ({ visitor }) => `${count(visitor.fingerprints.length, 'real device')} share this IP`,
  returning_organic: () => 'the visitor also returns without clicking an ad',
  no_js: () => 'the tracking tag did not run on paid visits',
  quick_back: () => 'visits that bounced straight back to the ad',
  human_friction: () => 'human-like frustration clicks were recorded',
  network_intel: ({ visitor }) => `this network was blocked on ${count(visitor.networkBlockedAccounts30d, 'other account')}`,
};

export function signalPhrase(ctx: PhraseContext, production = import.meta.env.PROD) {
  const phrase = SIGNAL_PHRASES[ctx.signal.signalId];
  if (phrase) return phrase(ctx);
  if (!production) throw new Error(`Missing verdict phrase: ${ctx.signal.signalId}`);
  return sentenceCase(SIGNAL_LABELS[ctx.signal.signalId] ?? 'Unclassified risk signal');
}

export function verdict(visitor: Visitor, visits: Visit[], topSignals: SignalHit[], timeZone: string) {
  const triggerIndex = visits.findIndex((visit) => visit.id === visitor.blockedAtVisitId);
  const evidence = triggerIndex >= 0 ? visits.slice(0, triggerIndex + 1) : visits;
  const date = (at: string) => new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
  const time = (at: string) => new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  const raising = topSignals.filter((signal) => signal.points > 0).slice(0, 2);
  const lowering = topSignals.find((signal) => signal.points < 0);
  let reason = raising.map((signal) => signalPhrase({ visitor, visits: evidence, signal })).join(' and ');
  if (visitor.networkType === 'datacenter' && !raising.some((signal) => signal.signalId === 'datacenter_ip')) reason += ' from a data-center IP';
  if (lowering) reason += `${reason ? ', but ' : ''}${signalPhrase({ visitor, visits, signal: lowering })}`;
  reason = sentenceCase(reason || 'The recorded risk signals are being evaluated');
  if (visitor.status === 'blocked') return `Blocked on ${date(visitor.blockedAt!)} at ${time(visitor.blockedAt!)} after visit ${triggerIndex + 1} of ${visits.length}: ${reason}.`;
  if (visitor.status === 'pending') return `Blocking now: The score crossed ${visitor.threshold} at visit ${triggerIndex + 1}, and exclusions are syncing to connected ad platforms.`;
  if (visitor.status === 'failed') {
    const failed = visitor.exclusions.find((row) => row.state === 'failed');
    const platform = failed?.platform === 'google_ads' ? 'Google Ads' : failed?.platform === 'meta_ads' ? 'Meta Ads' : 'An ad platform';
    return `We made a block decision at visit ${triggerIndex + 1}, but ${platform} rejected the exclusion. ${failed?.error ? sentenceCase(failed.error.replace(/[.!]+$/, '')) : 'Review the exclusion error to stop more paid clicks'}.`;
  }
  if (visitor.status === 'allowed') return `Always allowed by ${visitor.allowedBy?.user ?? 'your team'}${visitor.allowedBy ? ` on ${date(visitor.allowedBy.at)}` : ''}. ${triggerIndex >= 0 ? `A prior block decision was recorded at visit ${triggerIndex + 1}. ` : ''}${visitor.allowedBy?.note ? `Note: “${visitor.allowedBy.note}”.` : 'The manual allowance takes priority.'}`;
  if (visitor.status === 'monitoring' && !visits.some((visit) => visit.source === 'paid')) return 'Suspicious, but there’s nothing to block: This visitor has never clicked your ads, so no ad spend is at risk.';
  if (visitor.status === 'monitoring') return `Not blocked. Risk is ${visitor.riskScore}, ${count(Math.max(0, visitor.threshold - visitor.riskScore), 'point')} under the block threshold: ${reason}.`;
  return `Looks like a real visitor: ${count(visits.length, 'visit')} with normal engagement${visits.some((visit) => visit.converted) ? ' and a conversion' : ''}.`;
}
