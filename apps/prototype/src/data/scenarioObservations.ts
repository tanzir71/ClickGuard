import type { Visit } from './types';

/** Scenario observations, not score targets. The scoring engine has no hero-specific branches. */
export function tuneHeroObservations(scenario: string, visits: Visit[]) {
  const interaction = (visit: Visit, level: Visit['interaction']['level']) => {
    visit.interaction = {
      level,
      scrollPct: level === 'none' ? 0 : level === 'low' ? 12 : 42,
      clicks: level === 'medium' ? 2 : 0,
      timeMs: level === 'none' ? 1200 : 32000,
      pointerMoves: level === 'none' ? 0 : level === 'low' ? 3 : 48,
    };
    visit.durationMs = visit.interaction.timeMs;
    visit.events = [
      { t: 0, kind: 'landed', label: `Landed on ${visit.landingPath}` },
      ...(level === 'medium' ? [{ t: 1100, kind: 'scroll' as const, label: 'Scrolled to 42%' }] : []),
      ...visit.events.filter((event) => ['form_submit', 'conversion'].includes(event.kind)),
      {
        t: visit.durationMs - 20,
        kind: 'exit',
        label: level === 'none' ? 'Exited with no interaction' : 'Session ended',
      },
    ];
  };
  for (const [index, visit] of visits.entries()) {
    if (scenario === 'H1') {
      // A direct probe, then five paid visits. Detection strengthens at the reused-ID visit.
      if (index === 0) {
        visit.source = 'direct';
        visit.platform = undefined;
        visit.cpc = undefined;
        visit.gclid = undefined;
        visit.campaign = undefined;
        visit.adGroup = undefined;
        visit.keyword = undefined;
        visit.matchType = undefined;
        visit.referrer = undefined;
        visit.landingUrl = `https://acme-shoes.com${visit.landingPath}`;
      }
      visit.botProbability = index < 5 ? 0.1 : 0.96;
      interaction(visit, index < 4 ? 'low' : index < 7 ? 'none' : 'medium');
      visit.device = { ...visit.device, timezone: index < 5 ? 'Europe/Berlin' : 'Asia/Dhaka' };
      visit.riskObservations = { timezoneMismatch: index >= 5 };
      const offsets = [0, 6, 13, 17, 24, 31, 40, 48, 59, 70, 80, 90];
      visit.startedAt = new Date(Date.parse('2026-09-14T08:02:11Z') + offsets[index] * 60000).toISOString();
    }
    if (scenario === 'H2') {
      visit.vpnProxy = index === 0;
      visit.riskObservations = { timezoneMismatch: index >= 7 };
      if (index >= 7) visit.device = { ...visit.device, timezone: 'Asia/Dhaka' };
      if (index === 7) visit.gclid = undefined;
      if (index === 7) visit.botProbability = 0.5;
      if (index === 8) visit.botProbability = 0.75;
      visit.landingPath = '/pricing';
      visit.landingUrl = 'https://acme-shoes.com/pricing';
    }
    if (scenario === 'H3') {
      visit.startedAt = new Date(
        Date.parse('2026-09-13T10:20:00Z') + [0, 700, 1550, 2450, 3350, 4200, 5000][index] * 60000,
      ).toISOString();
      interaction(visit, index < 2 ? 'none' : index < 4 ? 'low' : 'medium');
      visit.botProbability = index < 4 ? 0.75 : 0.94;
      if (index === 2) visit.gclid = undefined;
      visit.riskObservations = { timezoneMismatch: index === 3, outsideTargeting: index === 6 };
      if (index === 3) visit.device = { ...visit.device, timezone: 'Asia/Dhaka' };
    }
    if (scenario === 'H4') {
      visit.startedAt = new Date(
        Date.parse('2026-09-14T04:10:00Z') + [0, 660, 1430, 2100, 2800][index] * 60000,
      ).toISOString();
      visit.riskObservations = { outsideTargeting: index > 0, timezoneMismatch: true };
      visit.device = { ...visit.device, timezone: 'America/Chicago' };
      if (index === 0) visit.gclid = undefined;
      if (index === visits.length - 1) {
        visit.botProbability = 0.9;
        visit.durationMs = 42000;
        visit.interaction = { level: 'high', scrollPct: 66, clicks: 3, pointerMoves: 52, timeMs: 42000 };
        visit.events = [
          { t: 0, kind: 'landed', label: `Landed on ${visit.landingPath}` },
          { t: 8000, kind: 'scroll', label: 'Scrolled to 66%' },
          { t: 18000, kind: 'click', label: 'Clicked Checkout' },
          { t: 38000, kind: 'conversion', label: 'Completed purchase' },
          { t: 42000, kind: 'exit', label: 'Session ended' },
        ];
      }
    }
    if (scenario === 'H5') {
      visit.riskObservations = { timezoneMismatch: true };
      visit.device = { ...visit.device, timezone: 'Asia/Dhaka' };
    }
    if (scenario === 'H6') {
      visit.vpnProxy = index === 0;
      visit.riskObservations = { timezoneMismatch: true };
      visit.device = { ...visit.device, timezone: 'Asia/Dhaka' };
      if (index < 2)
        visit.events.push({ t: 3000, kind: 'dead_click', label: 'Clicked an unresponsive product control' });
      if (index >= 3) visit.gclid = 'Cj0_H6_REUSED';
    }
    if (scenario === 'H7') {
      visit.jsExecuted = false;
      visit.events = [];
      visit.activityBuckets = [];
      visit.vpnProxy = true;
      visit.riskObservations = { outsideTargeting: index > 0, timezoneMismatch: true };
      visit.device = { ...visit.device, timezone: 'Asia/Dhaka' };
      visit.gclid = undefined;
      visit.fbclid = undefined;
    }
    if (scenario === 'H11') {
      visit.riskObservations = { timezoneMismatch: true, outsideTargeting: true };
    }
    if (scenario === 'H13' && index === 4) {
      visit.durationMs = 35000;
      visit.interaction = { level: 'high', scrollPct: 60, clicks: 2, pointerMoves: 40, timeMs: 35000 };
      visit.events = [
        { t: 0, kind: 'landed', label: `Landed on ${visit.landingPath}` },
        { t: 6000, kind: 'scroll', label: 'Scrolled to 60%' },
        { t: 34000, kind: 'exit', label: 'Session ended' },
      ];
    }
  }
}
