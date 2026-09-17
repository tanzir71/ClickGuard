import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { buildVisitJourney, VisitRibbon, ThreatMonitor, type VisitVM } from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '.';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});
const blocked = visitorViewModels.find((visitor) => visitor.ip === '185.220.101.4')!;
const sample = (scores: number[], offsets: number[] = scores.map((_, index) => index * 60000)): VisitVM[] =>
  scores.map((score, index) => ({
    ...blocked.visits[0],
    source: 'paid',
    id: `test_${index}`,
    startedAt: new Date(Date.parse(FIXED_NOW) + offsets[index]).toISOString(),
    scoreBefore: scores[index - 1] ?? 0,
    scoreAfter: score,
    afterBlock: false,
  }));

describe('table risk journeys', () => {
  it('uses real time spacing and a shared 0–100 risk scale, without mutating visits', () => {
    const visits = sample([10, 30, 90], [0, 60000, 600000]);
    const chart = buildVisitJourney([visits[2], visits[0], visits[1]], 70);
    expect(chart.points.map((point) => point.visit.id)).toEqual(['test_0', 'test_1', 'test_2']);
    expect(chart.points.map((point) => point.x)).toEqual([8, 24.6, 174]);
    expect(chart.points.map((point) => point.y)).toEqual([33.8, 27.4, 8.2]);
    expect(chart.thresholdY).toBe(14.6);
    expect(chart.elapsed).toBe('10m');
    expect(buildVisitJourney(sample([10, 10, 10])).beforePath).not.toEqual(chart.beforePath);
    expect(visits[0].scoreAfter).toBe(10);
  });

  it('preserves the exact decision and post-decision path, without inventing a decision at a high score', () => {
    const chart = buildVisitJourney(blocked.visits, blocked.threshold, blocked.blockedAtVisitId);
    expect(chart.triggerIndex).toBe(5);
    expect(chart.markers.find((point) => point.kind === 'decision')?.visit.id).toBe(blocked.blockedAtVisitId);
    expect(chart.afterPath).not.toBe('');
    const unpaid = sample([30, 70, 88]).map((visit) => ({ ...visit, source: 'organic' as const }));
    expect(buildVisitJourney(unpaid).triggerIndex).toBe(-1);
    expect(buildVisitJourney(unpaid).markers.every((point) => point.kind === 'unpaid')).toBe(true);
  });

  it('handles empty, single, simultaneous, declining, and dense histories', () => {
    expect(buildVisitJourney([]).points).toHaveLength(0);
    const single = buildVisitJourney(sample([20]));
    expect(single.beforePath).toBe('M 91 37 V 30.6');
    expect(single.elapsed).toBe('1 visit');
    const decline = buildVisitJourney(sample([60, 20], [0, 0]));
    expect(decline.points.every((point) => point.x === 91)).toBe(true);
    expect(decline.points[1].y).toBeGreaterThan(decline.points[0].y);
    expect(decline.beforePath).not.toMatch(/NaN|Infinity/);
    const dense = buildVisitJourney(
      sample(Array.from({ length: 60 }, (_, index) => index + 30)),
      70,
      'test_40',
    );
    expect(dense.points).toHaveLength(60);
    expect(dense.markers.length).toBeLessThan(25);
    expect(dense.markers.some((point) => point.visit.id === 'test_40')).toBe(true);
    expect(dense.beforePath.split('H')).toHaveLength(81);
  });

  it('keeps right-angle corners between unchanged visit markers', () => {
    const chart = buildVisitJourney(sample([10, 30, 20]), 70, 'test_1');
    expect(chart.points.map(({ x, y }) => [x, y])).toEqual([
      [8, 33.8],
      [91, 27.4],
      [174, 30.6],
    ]);
    expect(chart.beforePath).toBe('M 8 37 V 33.8 H 49.5 V 33.8 V 27.4 H 91');
    expect(chart.afterPath).toBe('M 91 27.4 H 132.5 V 27.4 V 30.6 H 174');
    expect((chart.beforePath + chart.afterPath).replace(/[MHV\d.\s-]/g, '')).toBe('');
  });

  it('uses distinct marker shapes, and supports one tab stop with keyboard visit drill-down', () => {
    const onOpen = vi.fn();
    const visits = sample([10, 35, 75, 45]).map((visit, index) => ({
      ...visit,
      source: index === 3 ? ('organic' as const) : ('paid' as const),
      conversion: index === 3 ? { type: 'purchase' } : undefined,
      afterBlock: index === 3,
    }));
    const { container } = render(
      <VisitRibbon visits={visits} blockedAtVisitId="test_2" onDotClick={onOpen} />,
    );
    const chart = screen.getByRole('button', { name: /4 visit journey/ });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container.querySelector('[data-kind="decision"] path')).not.toBeNull();
    expect(container.querySelector('[data-kind="conversion"] rect')).not.toBeNull();
    act(() => chart.focus());
    expect(chart.textContent).toContain('#3 paid · 35 → 75');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(chart.textContent).toContain('#4 organic · 75 → 45');
    fireEvent.click(chart);
    expect(onOpen).toHaveBeenLastCalledWith('test_3');
    fireEvent.keyDown(chart, { key: 'Home' });
    fireEvent.click(chart);
    expect(onOpen).toHaveBeenLastCalledWith('test_0');
    fireEvent.keyDown(chart, { key: 'End' });
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(chart.textContent).toContain('4 visits · 3 paid');
  });

  it('selects the hovered visit using chart coordinates, with no tooltip wrapper offset', () => {
    const onOpen = vi.fn();
    const { container } = render(<VisitRibbon visits={sample([10, 20, 30])} onDotClick={onOpen} />);
    const plot = container.querySelector('svg')!;
    vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue({ left: 100, width: 200 } as DOMRect);
    fireEvent.mouseMove(plot, { clientX: 191 });
    const chart = screen.getByRole('button');
    expect(chart.textContent).toContain('#2 paid · 10 → 20');
    fireEvent.click(chart);
    expect(onOpen).toHaveBeenCalledWith('test_1');
  });

  it('preserves the selected visit when opening its visitor panel from the table', () => {
    render(<ThreatMonitor visitors={[blocked]} now={FIXED_NOW} />);
    const results = within(screen.getByRole('table', { name: 'Threat monitoring results' }));
    const chart = results.getByRole('button', { name: /12 visit journey/ });
    fireEvent.keyDown(chart, { key: 'Home' });
    fireEvent.click(chart);
    const selectedMarker = screen.getByRole('button', { name: 'Visit 1, score 34' });
    expect(selectedMarker.getAttribute('class')).toContain('chartSelected');
    expect(window.location.search).toContain('visitor=185.220.101.4');
  });
});
