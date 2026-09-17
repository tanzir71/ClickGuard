import type { DataSet, NetworkType, Platform, SignalHit, Source, Visit, Visitor, VisitorStatus } from './types';
import { account } from './account';

const device = {
  desktop: { type: 'desktop' as const, os: 'Windows 11', browser: 'Chrome 128', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0', screen: '1920×1080', language: 'en-US', timezone: 'America/Chicago' },
  mobile: { type: 'mobile' as const, os: 'iOS 19', browser: 'Safari 19', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile', screen: '390×844', language: 'en-GB', timezone: 'Europe/London' },
};

type HeroConfig = {
  scenario: string; ip: string; city?: string; region?: string; country?: string; isp?: string; asn?: string; networkType: NetworkType; status: VisitorStatus; score: number;
  count: number; first: string; gapMinutes: number; triggerIndex?: number; paidCount: number; platforms?: Platform[]; signals: SignalHit[]; devices?: number; interaction?: 'none' | 'low' | 'medium' | 'high'; bot?: number; vpn?: boolean;
  converted?: boolean; conversionValue?: number; form?: 'valid' | 'invalid' | 'disposable'; noJs?: boolean; allowed?: Visitor['allowedBy']; exclusionError?: string; organicOnly?: boolean;
};

function signal(signalId: SignalHit['signalId'], value: string, points: number, severity: SignalHit['severity'] = Math.abs(points) >= 18 ? 'high' : Math.abs(points) >= 8 ? 'med' : 'low'): SignalHit { return { signalId, value, points, severity }; }

function visitEvents(config: HeroConfig, interaction: HeroConfig['interaction'], duration: number, index: number, signals: SignalHit[]): Visit['events'] {
  if (config.noJs) return [];
  const events: Visit['events'] = [{ t: 0, kind: 'landed', label: `Landed on ${index % 2 ? '/sale/trail-runners' : '/'}` }];
  if (signals.length) events.push(...signals.slice(0, 2).map((item, signalIndex) => ({ t: 160 + signalIndex * 90, kind: 'signal' as const, label: `${item.signalId.replaceAll('_', ' ')}: ${item.value}` })));
  if (interaction === 'medium' || interaction === 'high') events.push({ t: Math.min(1200, duration / 4), kind: 'scroll', label: `Scrolled to ${interaction === 'high' ? 78 : 42}%`, meta: { depth: interaction === 'high' ? 78 : 42 } }, { t: Math.min(2600, duration / 2), kind: 'click', label: "Clicked 'View product'" });
  if (config.form && index === config.count - 1) events.push({ t: Math.min(duration - 200, 3200), kind: 'form_submit', label: `Submitted lead form · email ${config.form}`, meta: { email: 'j•••@example.com' } });
  if (config.converted && index === config.count - 1) events.push({ t: Math.min(duration - 100, 4200), kind: 'conversion', label: 'Completed purchase' });
  events.push({ t: Math.max(400, duration - 20), kind: 'exit', label: `${interaction === 'none' ? 'Exited with no interaction' : 'Session ended'}` });
  return events;
}

function buildHero(config: HeroConfig): { visitor: Visitor; visits: Visit[] } {
  const platforms = config.platforms ?? ['google_ads']; const fingerprints = Array.from({ length: config.devices ?? 1 }, (_, index) => `fp_${config.scenario}_${index + 1}`);
  const trigger = config.triggerIndex; const triggerScore = trigger === undefined ? undefined : Math.max(70, Math.min(config.score, config.score - Math.max(0, config.count - trigger - 1) * 3));
  const visits: Visit[] = Array.from({ length: config.count }, (_, index) => {
    const startedAt = new Date(new Date(config.first).getTime() + index * config.gapMinutes * 60000).toISOString();
    const afterBlock = trigger !== undefined && index > trigger;
    const isPaid = config.organicOnly ? false : (!afterBlock && index < config.paidCount) || (config.status === 'failed' && index > (trigger ?? config.count) && index === config.count - 1);
    let scoreAfter: number;
    if (trigger !== undefined && triggerScore !== undefined) {
      if (index < trigger) scoreAfter = Math.round(((index + 1) / Math.max(1, trigger)) * Math.min(66, triggerScore - 4));
      else if (index === trigger) scoreAfter = triggerScore;
      else scoreAfter = Math.round(triggerScore + ((index - trigger) / Math.max(1, config.count - trigger - 1)) * (config.score - triggerScore));
    } else scoreAfter = Math.round(((index + 1) / config.count) * config.score);
    const scoreBefore = index === 0 ? 0 : (() => {
      if (trigger !== undefined && triggerScore !== undefined) {
        if (index - 1 < trigger) return Math.round((index / Math.max(1, trigger)) * Math.min(66, triggerScore - 4));
        if (index - 1 === trigger) return triggerScore;
        return Math.round(triggerScore + ((index - 1 - trigger) / Math.max(1, config.count - trigger - 1)) * (config.score - triggerScore));
      }
      return Math.round((index / config.count) * config.score);
    })();
    const interaction = config.interaction ?? (config.status === 'clean' ? 'high' : 'low'); const durationMs = interaction === 'none' ? 800 + index * 37 : interaction === 'low' ? 9000 + index * 1300 : 45000 + index * 2100;
    const visitSignals = index === (trigger ?? config.count - 1) ? config.signals : config.signals.filter((_, signalIndex) => signalIndex === index % Math.max(1, config.signals.length)).slice(0, 1);
    const platform = isPaid ? (config.scenario === 'H1' ? 'google_ads' : config.status === 'failed' && afterBlock ? 'google_ads' : platforms[index % platforms.length]) : undefined; const source: Source = isPaid ? 'paid' : index % 2 ? 'organic' : 'direct';
    return {
      id: `${config.scenario.toLowerCase()}_v${String(index + 1).padStart(3, '0')}`, ip: config.ip, fingerprint: fingerprints[index % fingerprints.length]!, startedAt, durationMs,
      source, platform, campaign: isPaid ? (platform === 'meta_ads' ? 'Autumn Sale – Retargeting' : 'Running Shoes – Search') : undefined, adGroup: isPaid ? 'Trail – Exact' : undefined,
      keyword: isPaid ? (config.scenario === 'H2' ? 'commercial trail shoes wholesale' : 'trail running shoes sale') : undefined, matchType: isPaid ? 'exact' : undefined,
      gclid: isPaid && platform === 'google_ads' ? (config.scenario === 'H1' && [4, 5].includes(index) ? 'Cj0KCQ_REUSED_H1' : `Cj0KCQ_${config.scenario}_${index}`) : undefined,
      fbclid: isPaid && platform === 'meta_ads' ? `fb_${config.scenario}_${index}` : undefined, cpc: isPaid ? config.scenario === 'H1' ? 4.1 : config.scenario === 'H2' ? 6.2 : Number((2.1 + (index % 5) * 0.5).toFixed(2)) : undefined,
      referrer: source === 'organic' ? 'https://www.google.com/' : undefined, landingPath: index % 2 ? '/sale/trail-runners' : '/', landingUrl: `https://acme-shoes.com${index % 2 ? '/sale/trail-runners' : '/'}${isPaid ? '?utm_medium=cpc' : ''}`,
      pages: [{ path: index % 2 ? '/sale/trail-runners' : '/', t: 0 }], activityBuckets: Array.from({ length: 32 }, (_, bucket) => interaction === 'none' ? (bucket < 2 ? 0.15 : 0) : ((bucket + index) % 7) / 7),
      conversionType: config.converted && index === config.count - 1 ? 'purchase' : undefined, conversionValue: config.converted && index === config.count - 1 ? config.conversionValue : undefined,
      jsExecuted: !config.noJs, device: config.devices && index % 2 ? device.mobile : { ...device.desktop, timezone: config.scenario === 'H1' ? 'Asia/Dhaka' : device.desktop.timezone },
      interaction: { level: interaction, scrollPct: interaction === 'high' ? 78 : interaction === 'medium' ? 42 : interaction === 'low' ? 12 : 0, clicks: interaction === 'high' ? 5 : interaction === 'medium' ? 2 : 0, timeMs: durationMs, pointerMoves: interaction === 'none' ? 0 : interaction === 'low' ? 3 : 48 },
      botProbability: Math.min(0.99, (config.bot ?? (config.status === 'clean' ? 0.12 : 0.55)) + index * 0.002), vpnProxy: Boolean(config.vpn) && (config.scenario !== 'H3' || index === 1),
      formFill: config.form && index === config.count - 1 ? { emailMasked: config.form === 'valid' ? 'a•••@gmail.com' : 'j•••@mailinator.com', deliverability: config.form } : undefined,
      events: visitEvents(config, interaction, durationMs, index, visitSignals), signals: visitSignals, scoreBefore, scoreAfter, afterBlock, converted: config.converted && index === config.count - 1,
    };
  });
  const triggerVisit = trigger === undefined ? undefined : visits[trigger]; const blockedAt = triggerVisit ? new Date(new Date(triggerVisit.startedAt).getTime() + 30000).toISOString() : undefined;
  const exclusions: Visitor['exclusions'] = config.status === 'clean' || (config.status === 'monitoring' && config.paidCount === 0) ? [] : config.status === 'allowed' ? platforms.map((platform) => ({ platform, state: 'removed', at: config.allowed?.at })) : config.status === 'pending' ? [{ platform: 'google_ads', state: 'excluded', at: blockedAt }, { platform: 'meta_ads', state: 'syncing' }] : config.status === 'failed' ? [{ platform: 'google_ads', state: 'failed', error: config.exclusionError }, { platform: 'meta_ads', state: 'excluded', at: blockedAt }] : config.status === 'blocked' ? [...platforms.map((platform, index) => ({ platform, state: 'excluded' as const, at: blockedAt ? new Date(new Date(blockedAt).getTime() + index * 45000).toISOString() : undefined })), ...(!platforms.includes('meta_ads') ? [{ platform: 'meta_ads' as const, state: 'not_connected' as const }] : [])] : platforms.map((platform) => ({ platform, state: 'not_connected' as const }));
  const visitor: Visitor = {
    scenario: config.scenario, ip: config.ip, geo: { city: config.city, region: config.region, country: config.country ?? '' }, isp: config.isp, asn: config.asn, asnName: config.isp,
    networkType: config.networkType, fingerprints, firstSeen: visits[0].startedAt, lastSeen: visits.at(-1)!.startedAt, reviewed: config.status === 'clean',
    related: { sameFingerprintIps: config.networkType === 'datacenter' ? ['192.0.2.18', '192.0.2.19'] : [], subnet24Ips: config.networkType === 'datacenter' ? ['192.0.2.20'] : [], asnVisitorCount: config.networkType === 'datacenter' ? 14 : 3, asnBlockedCount: config.networkType === 'datacenter' ? 11 : 0 },
    networkBlockedAccounts30d: config.networkType === 'datacenter' ? 38 : 0, status: config.status, riskScore: config.score, threshold: 70, blockedAt, blockedAtVisitId: triggerVisit?.id,
    decision: blockedAt ? { by: config.allowed ? { user: config.allowed.user } : 'auto', at: blockedAt, rule: 'score>=70' } : undefined, exclusions, allowedBy: config.allowed, visitIds: visits.map((visit) => visit.id),
  };
  return { visitor, visits };
}

export function createHeroScenarios(): DataSet {
  const heroes: HeroConfig[] = [
    { scenario: 'H1', ip: '185.220.101.4', city: 'Frankfurt', region: 'Hesse', country: 'DE', isp: 'Hetzner Online', asn: 'AS24940', networkType: 'datacenter', status: 'blocked', score: 94, count: 12, first: '2026-09-14T08:02:11Z', gapMinutes: 6, triggerIndex: 5, paidCount: 6, platforms: ['google_ads', 'meta_ads'], interaction: 'none', bot: .94, signals: [signal('bot_probability', '96% max', 30), signal('click_frequency', '6 paid clicks / 38m', 25), signal('datacenter_ip', 'Hetzner Online', 22), signal('gclid_reuse', '2 visits', 20), signal('timezone_mismatch', 'Asia/Dhaka', 10)] },
    { scenario: 'H2', ip: '98.42.17.203', city: 'Austin', region: 'Texas', country: 'US', isp: 'AT&T Business', asn: 'AS7018', networkType: 'corporate', status: 'blocked', score: 78, count: 9, first: '2026-09-10T15:10:00Z', gapMinutes: 960, triggerIndex: 7, paidCount: 9, interaction: 'low', bot: .42, signals: [signal('keyword_fixation', '$6.20 wholesale keyword', 10), signal('business_hours_competitor', 'Weekdays 9–5', 8), signal('click_frequency', '9 paid clicks / 6d', 12)] },
    { scenario: 'H3', ip: '72.14.201.88', city: 'Austin', region: 'Texas', country: 'US', isp: 'Spectrum', asn: 'AS11427', networkType: 'residential', status: 'monitoring', score: 64, count: 7, first: '2026-09-13T10:20:00Z', gapMinutes: 620, paidCount: 4, devices: 3, interaction: 'medium', bot: .48, vpn: true, form: 'valid', signals: [signal('click_frequency', '4 paid clicks / 5d', 12), signal('vpn_proxy', '1 of 7 visits', 12), signal('shared_ip', '3 real devices', -10), signal('form_valid_email', 'Deliverable address', -10), signal('returning_organic', '3 unpaid returns', -5)] },
    { scenario: 'H4', ip: '203.0.113.77', city: 'Singapore', country: 'SG', isp: 'NordVPN', asn: 'AS9009', networkType: 'vpn', status: 'monitoring', score: 57, count: 5, first: '2026-09-14T04:10:00Z', gapMinutes: 700, paidCount: 5, vpn: true, interaction: 'low', bot: .55, converted: true, conversionValue: 84, signals: [signal('vpn_proxy', '5 of 5 visits', 12), signal('bot_probability', '57% max', 8), signal('converted', 'Purchase · $84', -25)] },
    { scenario: 'H5', ip: '45.83.64.9', city: 'Amsterdam', country: 'NL', isp: 'M247 Europe', asn: 'AS9009', networkType: 'datacenter', status: 'monitoring', score: 88, count: 40, first: '2026-09-16T06:00:00Z', gapMinutes: 3, paidCount: 0, organicOnly: true, interaction: 'none', bot: .91, signals: [signal('bot_probability', '93% max', 30), signal('datacenter_ip', 'M247 Europe', 22), signal('interaction_none', '40 visits', 18)] },
    { scenario: 'H6', ip: '81.2.69.160', city: 'London', country: 'GB', isp: 'BT', asn: 'AS2856', networkType: 'residential', status: 'allowed', score: 71, count: 5, first: '2026-09-14T09:00:00Z', gapMinutes: 12, triggerIndex: 4, paidCount: 5, devices: 2, interaction: 'medium', bot: .25, allowed: { user: 'Sarah Chen', at: '2026-09-15T10:00:00Z', note: 'Our buyer at Harrods' }, signals: [signal('click_frequency', '5 paid clicks / 1h', 25), signal('shared_ip', '2 real devices', -10), signal('interaction_high', 'Product comparison', -6)] },
    { scenario: 'H7', ip: '192.0.2.44', city: 'Toronto', country: 'CA', isp: 'Rogers', asn: 'AS812', networkType: 'residential', status: 'pending', score: 83, count: 2, first: '2026-09-17T13:48:00Z', gapMinutes: 11, triggerIndex: 1, paidCount: 2, platforms: ['google_ads', 'meta_ads'], interaction: 'none', bot: .9, signals: [signal('bot_probability', '91% max', 30), signal('no_js', 'Tag did not run', 16), signal('click_frequency', 'Repeat paid click', 12)] },
    { scenario: 'H8', ip: '198.51.100.23', city: 'New York', country: 'US', isp: 'DigitalOcean', asn: 'AS14061', networkType: 'datacenter', status: 'failed', score: 90, count: 4, first: '2026-09-17T08:00:00Z', gapMinutes: 60, triggerIndex: 2, paidCount: 4, platforms: ['google_ads', 'meta_ads'], interaction: 'none', bot: .88, exclusionError: "Campaign 'Brand – Exact' reached 500 IP exclusions", signals: [signal('bot_probability', '90% max', 30), signal('datacenter_ip', 'DigitalOcean', 22), signal('click_frequency', '4 paid clicks', 12)] },
    { scenario: 'H9', ip: '100.64.12.8', city: 'Chicago', country: 'US', isp: 'T-Mobile', asn: 'AS21928', networkType: 'mobile', status: 'clean', score: 22, count: 22, first: '2026-09-11T08:00:00Z', gapMinutes: 400, paidCount: 5, devices: 14, interaction: 'high', bot: .09, signals: [signal('shared_ip', '14 real devices', -10), signal('interaction_high', 'Normal engagement', -18)] },
    { scenario: 'H10', ip: '66.249.70.11', city: 'Seattle', country: 'US', isp: 'Comcast', asn: 'AS7922', networkType: 'residential', status: 'clean', score: 0, count: 3, first: '2026-09-16T18:00:00Z', gapMinutes: 90, paidCount: 1, interaction: 'high', bot: .04, converted: true, conversionValue: 128, signals: [signal('converted', 'Purchase · $128', -25), signal('interaction_high', '3-minute session', -12)] },
    { scenario: 'H11', ip: '5.188.10.120', city: 'Moscow', country: 'RU', isp: 'M247', asn: 'AS9009', networkType: 'proxy', status: 'blocked', score: 100, count: 60, first: '2026-08-18T08:00:00Z', gapMinutes: 720, triggerIndex: 45, paidCount: 46, interaction: 'low', bot: .72, vpn: true, signals: [signal('click_frequency', '46 paid clicks', 25), signal('vpn_proxy', 'Proxy network', 12), signal('bot_probability', '84% max', 18), signal('network_intel', '21 other accounts', 10)] },
    { scenario: 'H12', ip: '192.0.2.212', country: '', networkType: 'residential', status: 'clean', score: 8, count: 1, first: '2026-09-17T09:22:00Z', gapMinutes: 10, paidCount: 0, interaction: 'medium', bot: .08, signals: [] },
    { scenario: 'H13', ip: '194.61.40.12', city: 'Sofia', country: 'BG', isp: 'OVH', asn: 'AS16276', networkType: 'datacenter', status: 'blocked', score: 86, count: 6, first: '2026-09-16T11:00:00Z', gapMinutes: 9, triggerIndex: 3, paidCount: 4, platforms: ['meta_ads', 'google_ads'], interaction: 'none', bot: .81, form: 'invalid', signals: [signal('form_invalid_email', '3 undeliverable forms', 20), signal('bot_probability', '82% max', 18), signal('datacenter_ip', 'OVH', 22)] },
  ];
  const built = heroes.map(buildHero); return { account, visitors: built.map((item) => item.visitor), visits: built.flatMap((item) => item.visits) };
}
