import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { getOverviewMetrics, Stat, ThreatMonitor } from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '.';

afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });

describe('account overview cards', () => {
  it('derives disjoint breakdowns that reconcile with every headline', () => {
    const stats = getOverviewMetrics(visitorViewModels);
    const sum = (rows: { value: number }[]) => rows.reduce((total, row) => total + row.value, 0);
    expect(sum(stats.trafficRows)).toBe(stats.visitors);
    expect(sum(stats.decisionRows)).toBe(stats.decisions);
    expect(sum(stats.reviewRows)).toBe(stats.review);
    expect(sum(stats.wastedRows)).toBeCloseTo(stats.wasted, 8);
    expect(sum(stats.protectedRows)).toBeCloseTo(stats.protected, 8);
    expect(stats.visitors).toBe(160);
    expect(stats.decisions).toBe(36);
    expect(stats.review).toBe(visitorViewModels.filter((visitor) => visitor.needsReview).length);
    expect(stats.wasted).toBeCloseTo(visitorViewModels.reduce((sum, visitor) => sum + visitor.wastedSpend, 0), 8);
    expect(stats.protected).toBeCloseTo(visitorViewModels.reduce((sum, visitor) => sum + visitor.protectedSpendEst, 0), 8);
  });

  it('updates the review total when flags change and supports an empty account', () => {
    const reviewed = visitorViewModels.map((visitor) => ({ ...visitor, needsReview: false }));
    expect(getOverviewMetrics(reviewed).review).toBe(0);
    const empty = getOverviewMetrics([]);
    expect([empty.visitors, empty.decisions, empty.review, empty.wasted, empty.protected]).toEqual([0, 0, 0, 0, 0]);
    expect(empty.wastedRows.every((row) => row.displayValue === '$0.00')).toBe(true);
  });

  it('shows hover breakdowns, stays open over details, and dismisses with Escape', () => {
    const onClick = vi.fn();
    render(<Stat label="Visitors" value="10" caption="8 paid" onClick={onClick} actionLabel="View all visitors" breakdown={{ title: 'Visitor mix', rows: [{ label: 'Paid', value: 8 }, { label: 'Unpaid', value: 2 }] }} />);
    const card = screen.getByRole('button', { name: /Visitors: 10/ });
    fireEvent.mouseEnter(card.parentElement!);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('80%');
    expect(card.getAttribute('aria-describedby')).toBe(tooltip.id);
    fireEvent.mouseEnter(tooltip);
    expect(screen.getByRole('tooltip')).toBeDefined();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseLeave(card.parentElement!);
    fireEvent.mouseEnter(card.parentElement!);
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledOnce();
    fireEvent.mouseLeave(card.parentElement!);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('makes informational cards keyboard-accessible and avoids invalid zero percentages', () => {
    render(<Stat label="Protected" value="$0" breakdown={{ title: 'Protection', rows: [{ label: 'Residential', value: 0 }] }} />);
    const card = screen.getByRole('button', { name: /Protected: \$0/ });
    act(() => card.focus());
    expect(screen.getByRole('tooltip').textContent).toContain('—');
    expect(screen.getByRole('tooltip').textContent).not.toMatch(/NaN|Infinity/);
    fireEvent.keyDown(card, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => card.blur());
  });

  it('keeps card actions wired to the matching block and review cohorts', () => {
    const sample = visitorViewModels.filter((visitor) => ['failed', 'pending', 'monitoring'].includes(visitor.status)).slice(0, 5);
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    const summary = within(screen.getByRole('region', { name: 'Threat monitoring summary' }));
    const savedViews = within(screen.getByRole('group', { name: 'Saved views' }));
    fireEvent.click(summary.getByRole('button', { name: /Block decisions:/ }));
    expect(savedViews.getByRole('button', { name: 'Blocked' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(summary.getByRole('button', { name: /Needs review:/ }));
    expect(savedViews.getByRole('button', { name: 'Needs review' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(summary.getByRole('button', { name: /Visitors:/ }));
    expect(savedViews.getByRole('button', { name: 'All visitors' }).getAttribute('aria-pressed')).toBe('true');
  });
});
