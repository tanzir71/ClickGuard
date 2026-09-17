import { mulberry32, pick } from './seed';
import { account } from './account';
import type { DataSet, NetworkType, Platform, Visit, Visitor, VisitorStatus } from './types';

const NOW = new Date('2026-09-17T14:00:00Z').getTime();
const countries = [
  {
    country: 'US',
    cities: ['Austin', 'Chicago', 'Portland', 'Seattle'],
    isps: ['Comcast', 'Spectrum', 'Verizon Fios', 'AT&T'],
  },
  {
    country: 'GB',
    cities: ['London', 'Manchester', 'Bristol'],
    isps: ['BT', 'Sky Broadband', 'Virgin Media'],
  },
  { country: 'CA', cities: ['Toronto', 'Vancouver'], isps: ['Rogers', 'Bell Canada'] },
  { country: 'DE', cities: ['Berlin', 'Hamburg'], isps: ['Deutsche Telekom', 'Vodafone DE'] },
] as const;
const campaigns = ['Running Shoes – Search', 'Brand – Exact', 'Trail – PMax', 'Autumn Sale – Retargeting'];

function crowdStatus(random: () => number): VisitorStatus {
  const value = random();
  if (value < 0.18) return 'blocked';
  if (value < 0.26) return 'monitoring';
  if (value < 0.28) return 'allowed';
  if (value < 0.29) return 'pending';
  if (value < 0.3) return 'failed';
  return 'clean';
}

export function createCrowd(count = 147): DataSet {
  const random = mulberry32(20260918);
  const visitors: Visitor[] = [];
  const visits: Visit[] = [];
  for (let index = 0; index < count; index += 1) {
    const status = crowdStatus(random);
    const blockedKind = ['blocked', 'pending', 'failed'].includes(status);
    const visitCount = 3 + Math.floor(random() * 5);
    const location = pick(random, countries);
    const city = pick(random, location.cities);
    const isp = pick(random, location.isps);
    const networkType: NetworkType =
      blockedKind && random() < 0.55
        ? pick(random, ['datacenter', 'proxy', 'vpn'] as const)
        : random() < 0.08
          ? 'mobile'
          : 'residential';
    const ip = `192.0.${20 + Math.floor(index / 230)}.${20 + index}`;
    const fingerprints = Array.from(
      { length: random() < 0.15 ? 3 + Math.floor(random() * 4) : 1 },
      (_, deviceIndex) => `fp_c${index}_${deviceIndex}`,
    );
    // Retain a busy recent week, plus deterministic older records for the 30-day view.
    const daysAgo = index % 3 === 0 ? 8 + (index % 21) : index % 7;
    const lastOffset = daysAgo * 86400000 + Math.floor(random() * 10) * 3600000;
    const gap = 25 * 60000 + Math.floor(random() * 8) * 3600000;
    const firstAt = NOW - lastOffset - (visitCount - 1) * gap;
    const platform: Platform = random() < 0.72 ? 'google_ads' : 'meta_ads';
    const visitorVisits: Visit[] = [];
    for (let visitIndex = 0; visitIndex < visitCount; visitIndex += 1) {
      const mustPay = blockedKind && visitIndex === visitCount - 1;
      const isPaid = mustPay || random() < 0.62;
      const interaction = blockedKind
        ? random() < 0.65
          ? 'none'
          : 'low'
        : random() < 0.35
          ? 'high'
          : 'medium';
      const durationMs =
        interaction === 'none' ? 900 + Math.floor(random() * 1200) : 22000 + Math.floor(random() * 160000);
      const startedAt = new Date(firstAt + visitIndex * gap).toISOString();
      const visit: Visit = {
        id: `c${index}_v${visitIndex}`,
        ip,
        fingerprint: fingerprints[visitIndex % fingerprints.length]!,
        startedAt,
        durationMs,
        source: isPaid ? 'paid' : random() < 0.5 ? 'organic' : 'direct',
        platform: isPaid ? platform : undefined,
        campaign: isPaid ? pick(random, campaigns) : undefined,
        adGroup: isPaid ? 'General' : undefined,
        keyword: isPaid ? pick(random, ['running shoes', 'trail trainers', 'acme shoes']) : undefined,
        matchType: isPaid ? 'broad' : undefined,
        gclid: isPaid && platform === 'google_ads' ? `Cj0_c${index}_${visitIndex}` : undefined,
        fbclid: isPaid && platform === 'meta_ads' ? `fb_c${index}_${visitIndex}` : undefined,
        cpc: isPaid ? Number((0.8 + random() * 5.7).toFixed(2)) : undefined,
        referrer: isPaid ? undefined : 'https://www.google.com/',
        landingPath: visitIndex % 2 ? '/products/trail-runner' : '/',
        landingUrl: `https://acme-shoes.com${visitIndex % 2 ? '/products/trail-runner' : '/'}`,
        pages: [{ path: '/', t: 0 }],
        activityBuckets: Array.from({ length: 24 }, (_, bucket) =>
          interaction === 'none' ? 0 : ((bucket + visitIndex) % 6) / 6,
        ),
        jsExecuted: true,
        device: {
          type: random() < 0.55 ? 'mobile' : 'desktop',
          os: random() < 0.5 ? 'iOS 19' : 'Windows 11',
          browser: random() < 0.7 ? 'Chrome 128' : 'Safari 19',
          ua: 'Mozilla/5.0 (compatible; ClickGuard demo fixture)',
          screen: random() < 0.55 ? '390×844' : '1920×1080',
          language: 'en-US',
          timezone: location.country === 'GB' ? 'Europe/London' : 'America/Chicago',
        },
        interaction: {
          level: interaction,
          scrollPct: interaction === 'none' ? 0 : interaction === 'low' ? 10 : 66,
          clicks: interaction === 'none' ? 0 : 2,
          timeMs: durationMs,
          pointerMoves: interaction === 'none' ? 0 : 36,
        },
        botProbability: blockedKind ? 0.7 + random() * 0.28 : random() * 0.5,
        vpnProxy: ['vpn', 'proxy'].includes(networkType),
        events:
          interaction === 'none'
            ? [
                { t: 0, kind: 'landed', label: 'Landed on page' },
                { t: Math.max(600, durationMs - 10), kind: 'exit', label: 'Exited with no interaction' },
              ]
            : [
                { t: 0, kind: 'landed', label: 'Landed on page' },
                { t: 1100, kind: 'scroll', label: 'Scrolled to 66%', meta: { depth: 66 } },
                { t: 2400, kind: 'click', label: "Clicked 'View product'" },
                { t: durationMs - 10, kind: 'exit', label: 'Session ended' },
              ],
        signals: [],
        scoreSteps: [],
        scoreBefore: 0,
        scoreAfter: 0,
        afterBlock: false,
      };
      visitorVisits.push(visit);
      visits.push(visit);
    }
    const triggerVisit = blockedKind ? visitorVisits.at(-1) : undefined;
    const blockedAt = triggerVisit
      ? new Date(new Date(triggerVisit.startedAt).getTime() + 30000).toISOString()
      : undefined;
    const exclusions: Visitor['exclusions'] =
      status === 'failed'
        ? [{ platform, state: 'failed', error: "Campaign 'Brand – Exact' reached 500 IP exclusions" }]
        : status === 'pending'
          ? [{ platform, state: 'syncing' }]
          : status === 'blocked'
            ? [
                {
                  platform,
                  state: 'excluded',
                  at: blockedAt ? new Date(new Date(blockedAt).getTime() + 45000).toISOString() : undefined,
                },
              ]
            : status === 'allowed'
              ? [{ platform, state: 'removed', at: new Date(NOW - 3600000).toISOString() }]
              : [];
    visitors.push({
      ip,
      geo: { city, country: location.country },
      isp,
      asnName: isp,
      asn: `AS${10000 + index}`,
      networkType,
      fingerprints,
      firstSeen: visitorVisits[0]!.startedAt,
      lastSeen: visitorVisits.at(-1)!.startedAt,
      reviewed: status === 'clean',
      related: {
        sameFingerprintIps: [],
        subnet24Ips: [],
        asnVisitorCount: 2 + Math.floor(random() * 18),
        asnBlockedCount: blockedKind ? 1 + Math.floor(random() * 8) : 0,
      },
      networkBlockedAccounts30d: blockedKind ? Math.floor(random() * 16) : 0,
      status,
      riskScore: 0,
      threshold: 70,
      blockedAt,
      blockedAtVisitId: triggerVisit?.id,
      decision: blockedAt ? { by: 'auto', at: blockedAt, rule: 'score>=70' } : undefined,
      exclusions,
      allowedBy:
        status === 'allowed'
          ? { user: 'Tanzir', at: new Date(NOW - 3600000).toISOString(), note: 'Known customer' }
          : undefined,
      visitIds: visitorVisits.map((visit) => visit.id),
    });
  }
  return { account, visitors, visits };
}
