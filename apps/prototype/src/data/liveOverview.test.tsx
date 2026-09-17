import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AccountOverview, getLiveOverviewMetrics, getOverviewMetrics, OVERVIEW_DEMO_BATCHES, Stat, ThreatMonitor } from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '.';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/'); });
const nextBatch = (index: number) => act(() => { vi.advanceTimersByTime(OVERVIEW_DEMO_BATCHES[index % OVERVIEW_DEMO_BATCHES.length].delay); });
const visitorCard = () => screen.getByRole('button', { name: /^Visitors:/ });
const visitorTotal = () => visitorCard().getAttribute('aria-label');

describe('live account overview', () => {
  it('keeps every breakdown reconciled across repeated demo cycles without mutating the snapshot', () => {
    const base = getOverviewMetrics(visitorViewModels);
    const original = JSON.stringify(base);
    expect(getLiveOverviewMetrics(base, 0)).toEqual(base);
    for (let tick = 1; tick <= 100; tick++) {
      const stats = getLiveOverviewMetrics(base, tick);
      const sum = (rows: { value: number }[]) => rows.reduce((total, row) => total + row.value, 0);
      expect(sum(stats.trafficRows)).toBe(stats.visitors);
      expect(sum(stats.decisionRows)).toBe(stats.decisions);
      expect(sum(stats.reviewRows)).toBe(stats.review);
      expect(sum(stats.wastedRows)).toBeCloseTo(stats.wasted, 8);
      expect(sum(stats.protectedRows)).toBeCloseTo(stats.protected, 8);
      expect(stats.decisions).toBeLessThanOrEqual(stats.visitors);
      expect(stats.review).toBeLessThanOrEqual(stats.visitors);
      expect(stats.paid).toBeLessThanOrEqual(stats.visitors);
      expect(stats.protectedRows.every((row) => row.displayValue === row.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }))).toBe(true);
    }
    expect(JSON.stringify(base)).toBe(original);
  });

  it('stagger-updates only relevant cards and keeps open hover details in sync', () => {
    vi.useFakeTimers();
    render(<AccountOverview visitors={visitorViewModels} onView={() => undefined} />);
    expect(visitorTotal()).toContain('160');
    fireEvent.mouseEnter(visitorCard().parentElement!);
    nextBatch(0);
    expect(visitorTotal()).toContain('161');
    const tooltip = within(screen.getByRole('tooltip'));
    expect(tooltip.getByText('161')).toBeDefined();
    expect(tooltip.getByText('158')).toBeDefined();
    expect(tooltip.getByText(/simulated activity/)).toBeDefined();
    expect(screen.getByRole('button', { name: /^Block decisions: 36/ })).toBeDefined();
    nextBatch(1);
    nextBatch(2);
    expect(visitorTotal()).toContain('164');
    expect(screen.getByRole('button', { name: /^Block decisions: 37/ })).toBeDefined();
  });

  it('pauses without resetting and resumes from the next batch', () => {
    vi.useFakeTimers();
    render(<AccountOverview visitors={visitorViewModels} onView={() => undefined} />);
    nextBatch(0);
    fireEvent.click(screen.getByRole('button', { name: 'Pause live demo' }));
    const paused = visitorTotal();
    act(() => vi.advanceTimersByTime(60000));
    expect(visitorTotal()).toBe(paused);
    expect(screen.getByText('Demo paused')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Resume live demo' }));
    nextBatch(1);
    expect(visitorTotal()).toContain('163');
  });

  it('suspends hidden tabs without catching up missed batches', () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    render(<AccountOverview visitors={visitorViewModels} onView={() => undefined} />);
    nextBatch(0);
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(60000));
    expect(visitorTotal()).toContain('161');
    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    nextBatch(1);
    expect(visitorTotal()).toContain('163');
  });

  it.each([{ visitors: [], enabled: true }, { visitors: visitorViewModels, enabled: false }])('does not run for an empty or disabled overview', (props) => {
    vi.useFakeTimers();
    render(<AccountOverview {...props} onView={() => undefined} />);
    const initial = visitorTotal();
    act(() => vi.advanceTimersByTime(60000));
    expect(visitorTotal()).toBe(initial);
    expect(screen.getByText('Snapshot')).toBeDefined();
    expect((screen.getByRole('button', { name: 'Pause live demo' }) as HTMLButtonElement).disabled).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up its single timer in StrictMode and on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<StrictMode><AccountOverview visitors={visitorViewModels} onView={() => undefined} /></StrictMode>);
    expect(vi.getTimerCount()).toBe(1);
    nextBatch(0);
    expect(visitorTotal()).toContain('161');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the table and funnel snapshot while overview totals advance', () => {
    vi.useFakeTimers();
    render(<ThreatMonitor visitors={visitorViewModels.slice(0, 3)} now={FIXED_NOW} />);
    const table = screen.getByRole('table', { name: 'Threat monitoring results' });
    const tableContent = table.innerHTML;
    const funnel = screen.getByRole('region', { name: 'Traffic evaluation' });
    const funnelContent = funnel.innerHTML;
    nextBatch(0);
    expect(visitorTotal()).toContain('Visitors: 4.');
    expect(table.innerHTML).toBe(tableContent);
    expect(funnel.innerHTML).toBe(funnelContent);
  });

  it('provides the exact accessible value during digit animations and handles carry/shortening', () => {
    const { rerender, container } = render(<Stat label="Visitors" value="99" animate breakdown={{ title: 'Visitors', rows: [] }} />);
    rerender(<Stat label="Visitors" value="100" animate breakdown={{ title: 'Visitors', rows: [] }} />);
    expect(screen.getByRole('button', { name: /^Visitors: 100/ })).toBeDefined();
    expect(container.querySelectorAll('[class*="rollingCharacter"]')).toHaveLength(3);
    rerender(<Stat label="Visitors" value="98" animate breakdown={{ title: 'Visitors', rows: [] }} />);
    expect(screen.getByRole('button', { name: /^Visitors: 98/ })).toBeDefined();
    expect(container.querySelectorAll('[class*="rollingCharacter"]')).toHaveLength(2);
  });
});
