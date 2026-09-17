import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ScoreWaterfall } from '@clickguard/ui';
import { rawData, visitorViewModels } from '.';
import { applyVisitScore, scoreDataSet, SIGNAL_CAPS } from './scoring';
import type { SignalHit, SignalId } from './types';

afterEach(cleanup);
const hit = (signalId: SignalId, points: number): SignalHit => ({ signalId, points, value: 'Observed in test', severity: 'med' });

describe('per-visit score arithmetic', () => {
  it('H1–H13 retain their scenario statuses and specified final-score tolerances', () => {
    const targets: Record<string, number> = { H1: 94, H2: 78, H3: 64, H4: 57, H5: 88, H6: 71, H7: 83, H8: 90, H13: 86 };
    const statuses = ['blocked', 'blocked', 'monitoring', 'monitoring', 'monitoring', 'allowed', 'pending', 'failed', 'clean', 'clean', 'blocked', 'clean', 'blocked'];
    const heroes = rawData.visitors.filter((visitor) => visitor.scenario);
    expect(heroes.map((visitor) => visitor.status)).toEqual(statuses);
    for (const visitor of heroes) if (visitor.scenario! in targets) expect(Math.abs(visitor.riskScore - targets[visitor.scenario!]), visitor.scenario).toBeLessThanOrEqual(3);
    for (const visitor of rawData.visitors) {
      const visits = rawData.visits.filter((visit) => visit.ip === visitor.ip);
      if (['blocked', 'pending', 'failed'].includes(visitor.status)) {
        const decision = visits.find((visit) => visit.id === visitor.blockedAtVisitId)!;
        expect(decision.source, visitor.ip).toBe('paid');
        expect(decision.scoreAfter, visitor.ip).toBeGreaterThanOrEqual(visitor.threshold);
        expect(visits.slice(0, visits.indexOf(decision)).every((visit) => visit.source !== 'paid' || visit.scoreAfter < visitor.threshold), visitor.ip).toBe(true);
      }
      if (visitor.status === 'monitoring' && visits.some((visit) => visit.source === 'paid')) expect(Math.max(...visits.map((visit) => visit.scoreAfter)), visitor.ip).toBeLessThan(visitor.threshold);
    }
  });

  it('H1–H13 and every crowd visit reconcile exactly, including limits and decay', () => {
    for (const visit of rawData.visits) {
      expect(visit.scoreBefore + visit.scoreSteps.reduce((sum, step) => sum + step.points, 0), visit.id).toBe(visit.scoreAfter);
      expect(visit.scoreAfter).toBeGreaterThanOrEqual(0);
      expect(visit.scoreAfter).toBeLessThanOrEqual(100);
    }
  });

  it('H1 visit 6 uses only the remaining category capacity and explicitly caps the total', () => {
    const visits = rawData.visits.filter((visit) => visit.ip === '185.220.101.4');
    const used = new Map<string, number>();
    for (const visit of visits) for (const step of visit.scoreSteps) {
      if (!(step.signalId in SIGNAL_CAPS)) continue;
      const before = used.get(step.signalId) ?? 0;
      expect(Math.abs(step.points), `${visit.id}: ${step.signalId}`).toBeLessThanOrEqual(SIGNAL_CAPS[step.signalId as SignalId] - before);
      used.set(step.signalId, before + Math.abs(step.points));
    }
    const trigger = visits[5];
    expect(trigger.scoreBefore).toBe(58);
    expect(trigger.scoreAfter).toBe(100);
    expect(trigger.scoreSteps.at(-1)).toMatchObject({ label: 'Score limit', reason: 'capped at 100' });
    expect(trigger.scoreSteps.some((step) => step.points === 0 && step.reason === 'cap reached')).toBe(true);
  });

  it('H4 purchase records a negative conversion step, not an unexplained rising score', () => {
    const converted = rawData.visits.find((visit) => visit.ip === '203.0.113.77' && visit.converted)!;
    expect(converted.scoreSteps).toContainEqual(expect.objectContaining({ signalId: 'converted', points: -25 }));
    expect(converted.scoreAfter).toBeLessThan(converted.scoreBefore);
  });

  it('H10 lower-bound clamping and seven-day inactivity adjustments remain visible', () => {
    const floor = applyVisitScore(0, [hit('converted', -25)], new Map());
    expect(floor.scoreSteps.at(-1)).toMatchObject({ label: 'Score limit', points: 25, reason: 'floored at 0' });
    const decay = applyVisitScore(80, [], new Map(), 14);
    expect(decay.scoreAfter).toBe(58);
    expect(decay.scoreSteps).toEqual([{ signalId: 'decay', label: 'Inactivity decay', reason: '14 inactive days', points: -22 }]);
  });

  it('H1 counts once-only tiers and additive caps independently', () => {
    const counted = new Map<SignalId, number>();
    expect(applyVisitScore(0, [hit('bot_probability', 18)], counted).scoreAfter).toBe(18);
    expect(applyVisitScore(18, [hit('bot_probability', 30)], counted).scoreSteps[0].points).toBe(12);
    expect(applyVisitScore(30, [hit('bot_probability', 18)], counted).scoreSteps[0].points).toBe(0);
    counted.set('interaction_none', 16);
    expect(applyVisitScore(30, [hit('interaction_none', 6)], counted).scoreSteps[0]).toMatchObject({ points: 2, rawPoints: 6 });
  });

  it('H1–H13 final scores and cumulative signal totals share the same ledger', () => {
    for (const visitor of visitorViewModels) {
      expect(visitor.riskScore, visitor.ip).toBe(visitor.visits.at(-1)!.scoreAfter);
      expect(visitor.topSignals.reduce((sum, signal) => sum + signal.points, 0), visitor.ip).toBe(visitor.riskScore);
      for (let index = 1; index < visitor.visits.length; index++) expect(visitor.visits[index].scoreBefore).toBe(visitor.visits[index - 1].scoreAfter);
    }
  });

  it('H3 unpaid returns only rise when another raising signal actually fires', () => {
    for (const visit of rawData.visits.filter((item) => item.source !== 'paid')) {
      if (visit.scoreSteps.some((step) => step.signalId === 'returning_organic') && visit.scoreAfter > visit.scoreBefore) {
        expect(visit.scoreSteps.some((step) => step.points > 0 && step.signalId !== 'score_limit'), visit.id).toBe(true);
      }
    }
    expect(visitorViewModels.find((visitor) => visitor.ip === '72.14.201.88')!.status).toBe('monitoring');
  });

  it('H1 scoring is deterministic and ignores hand-authored scores', () => {
    const input = { ...rawData, visitors: rawData.visitors.map((visitor) => ({ ...visitor, riskScore: 999 })), visits: rawData.visits.map((visit) => ({ ...visit, scoreBefore: 999, scoreAfter: 999 })) };
    const original = JSON.stringify(input);
    const scored = scoreDataSet(input);
    expect(JSON.stringify(input)).toBe(original);
    expect(scored.visits.map((visit) => visit.scoreSteps)).toEqual(scoreDataSet(input).visits.map((visit) => visit.scoreSteps));
    expect(scored.visits.every((visit) => visit.scoreBefore <= 100 && visit.scoreAfter <= 100)).toBe(true);
  });

  it('H1 separates This visit arithmetic from the Whole journey signal table', () => {
    const visitor = visitorViewModels.find((item) => item.ip === '185.220.101.4')!;
    render(<ScoreWaterfall visit={visitor.visits[5]} threshold={70} journey={visitor.visits} />);
    expect(screen.getByText('Score before this visit').nextElementSibling?.textContent).toBe('58');
    expect(screen.getByText('Score after this visit').nextElementSibling?.textContent).toContain('100 ◆ crossed 70');
    fireEvent.click(screen.getByRole('button', { name: 'Whole journey' }));
    expect(screen.queryByText('Score before this visit')).toBeNull();
    const table = within(screen.getByRole('table', { name: 'Whole journey signal contributions' }));
    expect(table.getByRole('columnheader', { name: 'First visit #' })).toBeTruthy();
    expect(table.getByRole('columnheader', { name: 'Times triggered' })).toBeTruthy();
    expect(table.getByRole('rowheader', { name: 'Reused ad click ID' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'This visit' }));
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Signals are capped by category. Scores decay after seven inactive days.')).toBeTruthy();
  });
});
