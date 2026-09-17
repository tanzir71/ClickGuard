import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DecisionRoute, SpendReceipt, ThreatMonitor } from '@clickguard/ui';
import { FIXED_NOW, rawData, visitorViewModels } from '.';
import { deriveVisitors } from './derive';
import { signalPhrase } from './verdict';
import type { SignalHit } from './types';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
const hero = (name: string) =>
  visitorViewModels.find(
    (visitor) => visitor.ip === rawData.visitors.find((item) => item.scenario === name)!.ip,
  )!;
function panel(name: string) {
  const visitor = hero(name);
  window.history.replaceState({}, '', `/?visitor=${visitor.ip}`);
  render(<ThreatMonitor visitors={[visitor]} now={FIXED_NOW} />);
  return screen.getByRole('complementary', { name: `Visitor ${visitor.ip} details` });
}

describe('scenario-aware visitor panel', () => {
  it.each(['H1', 'H3', 'H4', 'H5', 'H6', 'H8', 'H10'])(
    '%s reads naturally without raw enum prose',
    (name) => {
      const view = panel(name);
      expect(view.textContent).not.toMatch(
        /\b(vpn or proxy|shared ip|click burst and|1 visits|medium typical|none interaction)\b/,
      );
      expect(hero(name).verdict.endsWith('.')).toBe(true);
      expect(hero(name).verdict).not.toMatch(/: [a-z]/);
    },
  );

  it('H3 shows prospective account connections, spent-so-far and useful related rows', () => {
    const view = within(panel('H3'));
    expect(view.getByText('Spent so far')).toBeTruthy();
    expect(view.queryByText(/before block|since block|Protected/)).toBeNull();
    expect(view.getByRole('heading', { name: 'Will be excluded on' })).toBeTruthy();
    const google = view.getByText('Google Ads', { selector: 'strong' }).closest('div')!;
    expect(google.textContent).toContain('If blocked');
    expect(google.textContent).not.toContain('Not connected');
    expect(view.getByText('Yes · 1 of 7 visits')).toBeTruthy();
    expect(view.getByText('Medium on most visits')).toBeTruthy();
    expect(view.getByText('Would block if risk reaches 70')).toBeTruthy();
    const related = view.getByRole('heading', { name: 'Related' }).closest('section')!;
    expect(related.textContent).not.toMatch(/\b0\b/);
    fireEvent.click(view.getByRole('button', { name: 'Connect' }));
    expect(view.getByRole('status').textContent).toContain('connections are mocked');
  });

  it('H5 has no spend receipt and expects a first paid click', () => {
    const view = within(panel('H5'));
    expect(view.getByText(/No ad spend: this visitor never clicked an ad/)).toBeTruthy();
    expect(view.queryByText(/before block|since block|Protected/)).toBeNull();
    expect(view.getByText('Would block on its first paid click')).toBeTruthy();
  });

  it.each(['H6', 'H10'])('%s hides blocking spend rows and keeps conversion value when present', (name) => {
    const visitor = hero(name);
    render(<SpendReceipt visitor={visitor} />);
    expect(screen.getByText('Spend on this visitor')).toBeTruthy();
    expect(screen.queryByText(/before block|since block|Protected/)).toBeNull();
    if (name === 'H10') expect(screen.getByText('1 purchase · $128')).toBeTruthy();
  });

  it('H8 flags only paid leaks on failed platforms', () => {
    render(<SpendReceipt visitor={hero('H8')} />);
    const value = screen.getByText('Paid clicks since block').nextElementSibling!;
    expect(value.textContent).toBe('1');
    expect(value.className).toContain('kv-danger');
  });

  it('H3 has no misleading G dash and all visitors share account connections', () => {
    const rows = deriveVisitors(rawData);
    for (const visitor of rows.filter((item) => item.status !== 'clean')) {
      expect(visitor.exclusions.find((row) => row.platform === 'google_ads')?.state).not.toBe(
        'not_connected',
      );
      expect(visitor.exclusions.find((row) => row.platform === 'microsoft_ads')?.state).toBe('not_connected');
    }
    render(<ThreatMonitor visitors={[hero('H3')]} now={FIXED_NOW} />);
    expect(screen.getByRole('table').textContent).not.toContain('G –');
  });

  it('H3 hides Related entirely when all counts are zero', () => {
    const visitor = {
      ...hero('H3'),
      related: {
        sameFingerprintIps: 0,
        subnet24Ips: 0,
        asnVisitorCount: 0,
        asnBlockedCount: 0,
        networkBlockedAccounts30d: 0,
      },
    };
    window.history.replaceState({}, '', `/?visitor=${visitor.ip}`);
    render(<ThreatMonitor visitors={[visitor]} now={FIXED_NOW} />);
    expect(within(screen.getByRole('complementary')).queryByRole('heading', { name: 'Related' })).toBeNull();
  });

  it.each([
    [-2, 'Risk falling'],
    [0, 'Risk steady'],
    [2, 'Risk climbing'],
  ])('H3 route labels the actual direction (%s)', (delta, title) => {
    const visitor = hero('H3');
    const visits = visitor.visits
      .slice(0, 3)
      .map((visit, index) => ({ ...visit, scoreAfter: 10 + (index === 1 ? Number(delta) : 0) }));
    render(<DecisionRoute {...visitor} visits={visits} />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(/^1 visit · score/)).toBeTruthy();
    expect(screen.queryByText(/1 visits/)).toBeNull();
  });

  it('H1 phrase fallback fails loudly in development and stays readable in production', () => {
    const visitor = rawData.visitors.find((item) => item.scenario === 'H1')!;
    const context = {
      visitor,
      visits: rawData.visits.filter((visit) => visit.ip === visitor.ip),
      signal: { signalId: 'missing_phrase', value: '', points: 1, severity: 'low' } as unknown as SignalHit,
    };
    expect(() => signalPhrase(context, false)).toThrow('Missing verdict phrase');
    expect(signalPhrase(context, true)).toBe('Unclassified risk signal');
  });
});
