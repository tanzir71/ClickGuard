import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { getOverviewMetrics, getVisitorsInRange, ThreatMonitor, type VisitorVM } from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '.';

const atAge = (days: number) => new Date(Date.parse(FIXED_NOW) - days * 86400000).toISOString();
function visitor(ip: string, ages: number[]): VisitorVM {
  const base = visitorViewModels[0];
  const visits = ages.map((age, index) => ({
    ...base.visits[0],
    id: `${ip}-${index}`,
    startedAt: atAge(age),
    source: 'paid' as const,
    cpc: 10,
  }));
  return {
    ...base,
    ip,
    visits,
    blockedAt: FIXED_NOW,
    status: 'blocked',
    needsReview: true,
    paidVisits: ages.length,
    wastedSpend: ages.length * 10,
    protectedSpendEst: ages.length * 20.5,
  };
}
const sample = [visitor('192.0.2.1', [20, 5, 0.25]), visitor('192.0.2.2', [4]), visitor('192.0.2.3', [20])];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('selected date range', () => {
  it('scopes visitors, visits and money together without mutating full history or current status', () => {
    const before = JSON.stringify(sample);
    for (const [days, visitors, visits, wasted, protectedSpend] of [
      [1, 1, 1, 10, 20.5],
      [7, 2, 3, 30, 61.5],
      [30, 3, 5, 50, 102.5],
    ]) {
      const scoped = getVisitorsInRange(sample, FIXED_NOW, days);
      const stats = getOverviewMetrics(scoped);
      expect(stats.visitors).toBe(visitors);
      expect(stats.paid).toBe(visitors);
      expect(stats.decisions).toBe(visitors);
      expect(stats.review).toBe(visitors);
      expect(scoped.flatMap((item) => item.visits)).toHaveLength(visits);
      expect(stats.wasted).toBe(wasted);
      expect(stats.protected).toBe(protectedSpend);
      expect(stats.wastedRows.reduce((sum, row) => sum + row.value, 0)).toBe(wasted);
      expect(scoped[0].riskScore).toBe(sample[0].riskScore);
    }
    expect(JSON.stringify(sample)).toBe(before);
  });

  it('includes exact boundaries but excludes old, future and invalid timestamps', () => {
    const item = visitor('192.0.2.4', [31, 7 + 1 / 86400000, 7, 0, -1]);
    item.visits.push({ ...item.visits[0], id: 'invalid', startedAt: 'invalid' });
    const scoped = getVisitorsInRange([item], FIXED_NOW, 7);
    expect(scoped[0].visits.map((visit) => visit.startedAt)).toEqual([atAge(7), atAge(0)]);
    expect(getVisitorsInRange([visitor('192.0.2.5', [31, -1])], FIXED_NOW, 30)).toEqual([]);
  });

  it('counts only in-range pre-block paid costs and preserves the recorded protection cap', () => {
    const item = visitor('192.0.2.6', [10, 4, 2, 0.25]);
    item.blockedAt = atAge(1);
    item.visits[1].source = 'organic';
    item.protectedSpendEst = 15;
    item.status = 'monitoring'; // A manual unblock does not erase the historical estimate.
    const scoped = getVisitorsInRange([item], FIXED_NOW, 7)[0];
    expect(scoped.paidVisits).toBe(2);
    expect(scoped.paidVisitsBeforeBlock).toBe(1);
    expect(scoped.wastedSpend).toBe(10);
    expect(scoped.protectedSpendEst).toBe(15);
  });

  it('gives the demo distinct daily, weekly and monthly cohorts without changing hero records', () => {
    const totals = [1, 7, 30].map((days) =>
      getOverviewMetrics(getVisitorsInRange(visitorViewModels, FIXED_NOW, days)),
    );
    for (const metric of ['visitors', 'decisions', 'review', 'wasted', 'protected'] as const) {
      expect(totals[0][metric]).toBeLessThan(totals[1][metric]);
      expect(totals[1][metric]).toBeLessThan(totals[2][metric]);
    }
  });

  it('updates cards, breakdowns, funnel, table rows and range labels from the dropdown', () => {
    vi.useFakeTimers();
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    const summary = within(screen.getByRole('region', { name: 'Threat monitoring summary' }));
    const funnel = within(screen.getByRole('region', { name: 'Traffic evaluation' }));
    for (const [days, count, wasted, protectedSpend] of [
      [7, 2, 30, 62],
      [30, 3, 50, 103],
      [1, 1, 10, 21],
      [7, 2, 30, 62],
    ]) {
      const label = days === 1 ? 'Last 24 hours' : `Last ${days} days`;
      const menu = screen.getByText(/^Last (7 days|30 days|24 hours)$/, { selector: 'summary' });
      fireEvent.click(menu);
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
      expect(summary.getByRole('button', { name: new RegExp(`^Visitors: ${count}\\.`) })).toBeDefined();
      expect(
        summary.getByRole('button', { name: new RegExp(`^Block decisions: ${count}\\.`) }),
      ).toBeDefined();
      expect(summary.getByRole('button', { name: new RegExp(`^Needs review: ${count}\\.`) })).toBeDefined();
      const waste = summary.getByRole('button', { name: new RegExp(`^Wasted spend: \\$${wasted}\\.`) });
      expect(
        summary.getByRole('button', { name: new RegExp(`^Protected: ~\\$${protectedSpend}\\.`) }),
      ).toBeDefined();
      expect(funnel.getByRole('button', { name: new RegExp(`^Evaluated: ${count} visitors`) })).toBeDefined();
      expect(
        screen.getByRole('table', { name: 'Threat monitoring results' }).querySelectorAll('tbody > tr'),
      ).toHaveLength(count);
      expect(screen.getByText(`priority · desc · ${label}`)).toBeDefined();
      fireEvent.mouseEnter(waste.parentElement!);
      expect(screen.getByRole('tooltip').textContent).toContain(`$${wasted}.00`);
      expect(screen.getByRole('tooltip').textContent).toContain(label);
      fireEvent.mouseLeave(waste.parentElement!);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Visits' }));
    expect(screen.getByRole('table', { name: 'Visits' }).querySelectorAll('tbody > tr')).toHaveLength(3);
  });

  it('restores the URL range and keeps account cards independent of table search', () => {
    window.history.replaceState({}, '', '/?range=1');
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search visitors' }), {
      target: { value: 'no-match' },
    });
    const summary = within(screen.getByRole('region', { name: 'Threat monitoring summary' }));
    expect(summary.getByRole('button', { name: /^Visitors: 1\./ })).toBeDefined();
    expect(screen.getByText('No visitors match these filters')).toBeDefined();
    expect(new URLSearchParams(window.location.search).get('range')).toBe('1');
  });

  it('exports range-scoped counts/costs while the visitor panel retains the complete journey', async () => {
    window.history.replaceState({}, '', '/?range=1');
    const createObjectURL = vi.fn((blob: Blob) => `blob:${blob.type}`);
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = vi.fn();
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const csv = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(csv).toBe(
      `ip,status,risk,visits,paid_visits,wasted_spend\n192.0.2.1,blocked,${sample[0].riskScore},1,1,10.00`,
    );
    fireEvent.click(screen.getByText('192.0.2.1', { selector: 'strong' }));
    const panel = within(screen.getByRole('complementary', { name: 'Visitor 192.0.2.1 details' }));
    expect(
      panel.getByRole('button', { name: `Visit 3, score ${sample[0].visits[2].scoreAfter}` }),
    ).toBeDefined();
    expect(sample[0].visits).toHaveLength(3);
  });
});
