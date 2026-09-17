import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ActivityFunnel, formatFunnelPercent, getActivityFunnelStages, getFunnelMetrics, getFunnelProfile, ThreatMonitor } from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '.';

afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });

describe('activity funnel', () => {
  it('preserves nested default counts and separates block decisions from completion', () => {
    const stages = getActivityFunnelStages(visitorViewModels, FIXED_NOW, 7);
    expect(stages.map((stage) => stage.value)).toEqual([160, 155, 33, 17, 16]);
    const eligible = visitorViewModels.filter((visitor) => visitor.riskScore >= Math.max(40, visitor.threshold) && visitor.visits.some((visit) => visit.source === 'paid' && new Date(visit.startedAt).getTime() >= new Date(FIXED_NOW).getTime() - 7 * 86400000));
    for (const status of ['blocked', 'pending', 'failed']) expect(stages[4].detail).toContain(`${eligible.filter((visitor) => visitor.status === status).length} ${status}`);
    expect(stages[4].label).toBe('Block decision');
  });

  it('calculates overall share and previous-stage continuation independently', () => {
    const metrics = getFunnelMetrics(getActivityFunnelStages(visitorViewModels, FIXED_NOW, 7));
    expect(metrics[2].share).toBeCloseTo(33 / 160);
    expect(metrics[2].continuation).toBeCloseTo(33 / 155);
    expect(metrics[0].continuation).toBeNull();
    expect(formatFunnelPercent(metrics[1].share)).toBe('96.9%');
  });

  it('has safe empty, single-visitor, and flat profiles on a shared zero baseline', () => {
    const empty = getFunnelMetrics(getActivityFunnelStages([], FIXED_NOW, 7));
    expect(empty.every((stage) => stage.share === null && stage.continuation === null)).toBe(true);
    expect(formatFunnelPercent(null)).toBe('—');
    expect(getFunnelProfile([])).toEqual({ line: '', area: '' });
    expect(getFunnelProfile([null]).line).toBe('M0,72 L1000,72');
    expect(getFunnelProfile([1]).area).toBe('M0,0 L1000,0 L1000,72 L0,72 Z');
    expect(getFunnelProfile([1, 0.5, 0]).line).toContain(',36');
    expect(getFunnelProfile([1, 1]).line).toBe('M0,0 L440,0 L560,0 L1000,0');
  });

  it('keeps every date-window funnel nested and excludes out-of-range paid traffic', () => {
    for (const range of [1, 7, 30]) {
      const cutoff = new Date(FIXED_NOW).getTime() - range * 86400000;
      const cohort = visitorViewModels.filter((visitor) => visitor.visits.some((visit) => new Date(visit.startedAt).getTime() >= cutoff));
      const stages = getActivityFunnelStages(cohort, FIXED_NOW, range);
      expect(stages[1].value).toBe(cohort.filter((visitor) => visitor.visits.some((visit) => visit.source === 'paid' && new Date(visit.startedAt).getTime() >= cutoff)).length);
      for (let index = 1; index < stages.length; index++) expect(stages[index].value).toBeLessThanOrEqual(stages[index - 1].value);
    }
  });

  it('provides keyboard details, Escape dismissal, hover details, and an honest empty state', () => {
    const stages = getActivityFunnelStages(visitorViewModels, FIXED_NOW, 7);
    const { rerender, container } = render(<ActivityFunnel stages={stages} filtered={160} total={160} rangeLabel="Last 7 days" />);
    const risk = screen.getByRole('button', { name: /At risk: 33 visitors/ });
    fireEvent.focus(risk);
    expect(screen.getByRole('tooltip').textContent).toContain('21.3% of paid traffic visitors continue here');
    expect(risk.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
    fireEvent.keyDown(risk, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.blur(risk);
    const blocked = screen.getByRole('button', { name: /Block decision:/ });
    fireEvent.mouseEnter(blocked.closest('li')!);
    expect(screen.getByRole('tooltip').textContent).toContain('completed platform exclusion');
    fireEvent.mouseLeave(blocked.closest('li')!);
    expect(screen.queryByRole('tooltip')).toBeNull();
    rerender(<ActivityFunnel stages={getActivityFunnelStages([], FIXED_NOW, 7)} filtered={0} total={160} rangeLabel="Last 7 days" />);
    expect(screen.getByText('No visitors match the current filters')).toBeDefined();
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
    expect(container.querySelectorAll('svg path')).toHaveLength(1);
  });

  // The complete fixture renders hundreds of visit controls in jsdom.
  it('places the funnel below filters inside the results frame and reacts to filters', () => {
    render(<ThreatMonitor visitors={visitorViewModels} now={FIXED_NOW} />);
    const resultsGroup = within(screen.getByRole('region', { name: 'Traffic results' }));
    const funnelRegion = resultsGroup.getByRole('region', { name: 'Traffic evaluation' });
    const filters = resultsGroup.getByRole('region', { name: 'Filters' });
    expect(filters.nextElementSibling).toBe(funnelRegion);
    expect(funnelRegion.compareDocumentPosition(resultsGroup.getByRole('table', { name: 'Threat monitoring results' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const funnel = within(funnelRegion);
    fireEvent.change(screen.getByLabelText('Filter by risk'), { target: { value: 'high' } });
    expect(funnel.getByRole('button', { name: /Evaluated: 19 visitors/ })).toBeDefined();
    expect(funnel.getByRole('button', { name: /At risk: 17 visitors/ })).toBeDefined();
    fireEvent.click(screen.getByText('Last 7 days', { selector: 'summary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 24 hours' }));
    expect(funnel.getAllByText(/Last 24 hours/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByPlaceholderText(/Search IP/), { target: { value: 'no-matching-visitor' } });
    expect(funnel.getByText('No visitors match the current filters')).toBeDefined();
  }, 15000);
});
