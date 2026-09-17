import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RiskChart, type VisitVM } from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '.';

afterEach(cleanup);
const blocked = visitorViewModels.find((visitor) => visitor.ip === '185.220.101.4')!;
const sample = (scores: number[], offsets = scores.map((_, index) => index * 60000)): VisitVM[] => scores.map((score, index) => ({
  ...blocked.visits[0], id: `risk_${index}`, startedAt: new Date(Date.parse(FIXED_NOW) + offsets[index]).toISOString(),
  scoreBefore: scores[index - 1] ?? 0, scoreAfter: score, afterBlock: false,
}));

describe('detailed risk chart', () => {
  it('plots chronological visits using real elapsed time and a fixed risk scale', () => {
    const visits = sample([10, 30, 90], [0, 60000, 600000]);
    const { container } = render(<RiskChart visits={[visits[2], visits[0], visits[1]]} threshold={70} />);
    const circles = screen.getAllByRole('button').map((button) => button.querySelector('circle')!);
    expect(circles.map((circle) => Number(circle.getAttribute('cx')))).toEqual([32, 65.6, 368]);
    circles.forEach((circle, index) => expect(Number(circle.getAttribute('cy'))).toBeCloseTo([123.6, 98.8, 24.4][index]));
    expect(Number(container.querySelector('line[class*="chartThreshold"]')?.getAttribute('y1'))).toBeCloseTo(49.2);
    expect(screen.getByText('Block threshold · 70')).toBeTruthy();
    expect(screen.getByText('Time →')).toBeTruthy();
    expect(visits[0].scoreAfter).toBe(10);
  });

  it('separates the decision from post-decision activity and preserves external selection', () => {
    const { container } = render(<RiskChart visits={blocked.visits} threshold={70} blockedAtVisitId={blocked.blockedAtVisitId} selectedVisitId={blocked.visits[0].id} />);
    expect(screen.getByRole('button', { name: 'Visit 1, score 13' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Visit 6, score 76' }).querySelector('path')).not.toBeNull();
    expect(container.querySelector('path[class*="chartAfterLine"]')?.getAttribute('d')).toContain('H');
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Visit 6, score 76' }));
    expect(screen.getByText('Block decision')).toBeTruthy();
    expect(container.querySelector('[class*="chartReadout"]')?.textContent).toContain('66 → 76');
    fireEvent.mouseLeave(screen.getByRole('group', { name: /Risk journey/ }));
    expect(container.querySelector('[class*="chartReadout"]')?.textContent).toContain('Visit 1');
  });

  it('has one tab stop, previews with arrows, and selects with Enter or Space without bubbling', () => {
    const onSelect = vi.fn(); const onParentKey = vi.fn();
    const { container } = render(<div onKeyDown={onParentKey}><RiskChart visits={sample([10, 45, 78])} threshold={70} onSelectVisit={onSelect} /></div>);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    const last = screen.getByRole('button', { name: 'Visit 3, score 78' });
    act(() => last.focus());
    fireEvent.keyDown(last, { key: 'Home' });
    const first = screen.getByRole('button', { name: 'Visit 1, score 10' });
    expect(document.activeElement).toBe(first);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(first, { key: ' ' });
    expect(onSelect).toHaveBeenLastCalledWith('risk_0');
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const next = screen.getByRole('button', { name: 'Visit 2, score 45' });
    expect(document.activeElement).toBe(next);
    fireEvent.keyDown(next, { key: 'Enter' });
    expect(onSelect).toHaveBeenLastCalledWith('risk_1');
    expect(onParentKey).not.toHaveBeenCalled();
  });

  it('does not invent a block decision for high unpaid risk', () => {
    const { container } = render(<RiskChart visits={sample([35, 80, 88]).map((visit) => ({ ...visit, source: 'organic' as const }))} threshold={70} />);
    expect(screen.queryByText('Decision')).toBeNull();
    expect(screen.queryByText('After decision')).toBeNull();
    expect(container.querySelector('path[class*="chartAfterLine"]')).toBeNull();
  });

  it('handles empty, single, coincident, declining, and dense histories', () => {
    const { container, rerender } = render(<RiskChart visits={[]} threshold={70} />);
    expect(screen.getByText('No visits in this range')).toBeTruthy();
    rerender(<RiskChart visits={sample([20])} threshold={70} />);
    expect(screen.getByText('Only visit so far')).toBeTruthy();
    expect(screen.getByRole('button').querySelector('circle')?.getAttribute('cx')).toBe('200');
    rerender(<RiskChart visits={sample([60, 20], [0, 0])} threshold={100} blockedAtVisitId="risk_1" />);
    expect(container.querySelector('path[class*="chartLine"]')?.getAttribute('d')).not.toMatch(/NaN|Infinity/);
    expect(screen.getByText('Block decision')).toBeTruthy();
    expect(container.querySelector('path[class*="chartAfterLine"]')).toBeNull();
    rerender(<RiskChart visits={sample(Array.from({ length: 60 }, (_, index) => index + 30))} threshold={85} blockedAtVisitId="risk_40" size="wide" />);
    expect(screen.getAllByRole('button')).toHaveLength(60);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    const decision = screen.getByRole('button', { name: 'Visit 41, score 70' });
    expect(decision.querySelector('path')).not.toBeNull();
    fireEvent.keyDown(decision, { key: 'End' });
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Visit 60, score 89');
  });
});
