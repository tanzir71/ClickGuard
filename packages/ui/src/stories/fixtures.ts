import type { SignalVM, VisitVM } from '../model';

export const signals: SignalVM[] = [
  { id: 'bot_probability', label: 'Likely automated', value: '96% max', points: 30, severity: 'high' },
  { id: 'click_frequency', label: 'Click burst', value: '6 paid clicks / 38m', points: 25, severity: 'high' },
  { id: 'shared_ip', label: 'Shared IP', value: '3 real devices', points: -10, severity: 'med' },
];

export const visits: VisitVM[] = Array.from({ length: 8 }, (_, index) => ({
  id: `fixture_${index}`, startedAt: new Date(Date.UTC(2026, 8, 14, 8, index * 6)).toISOString(), durationMs: index < 6 ? 1100 : 24000,
  source: index < 6 ? 'paid' : index % 2 ? 'organic' : 'direct', platform: index < 6 ? 'google_ads' : undefined, campaign: index < 6 ? 'Running Shoes – Search' : undefined,
  adGroup: index < 6 ? 'Trail – Exact' : undefined, keyword: index < 6 ? 'trail running shoes sale' : undefined, clickId: index < 6 ? `Cj0_fixture_${index}` : undefined,
  cpc: index < 6 ? 4.1 : undefined, landingPath: '/sale/trail-runners', landingUrl: 'https://acme-shoes.com/sale/trail-runners',
  interaction: { level: index < 6 ? 'none' : 'medium', scrollPct: index < 6 ? 0 : 45, clicks: index < 6 ? 0 : 2, pointerMoves: index < 6 ? 0 : 24 }, botProbability: index < 6 ? .96 : .24,
  vpnProxy: false, jsExecuted: true, events: [{ t: 0, kind: 'landed', label: 'Landed on /sale/trail-runners' }, { t: 180, kind: 'signal', label: 'Bot probability 96%' }, { t: 1100, kind: 'exit', label: 'Exited with no interaction' }],
  activityBuckets: Array.from({ length: 24 }, (_, bucket) => index < 6 ? (bucket < 2 ? .1 : 0) : (bucket % 5) / 5), signals: index === 5 ? signals.slice(0, 2) : [],
  scoreBefore: index * 12, scoreAfter: Math.min(94, (index + 1) * 12), afterBlock: index > 5,
  device: { type: 'desktop', os: 'Windows 11', browser: 'Chrome 128', ua: 'Mozilla/5.0 fixture', screen: '1920×1080', language: 'en-US', timezone: 'Asia/Dhaka' },
}));
