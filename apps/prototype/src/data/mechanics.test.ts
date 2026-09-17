import { describe, expect, it } from 'vitest';
import { rawData } from '.';

describe('deterministic traffic mechanics', () => {
  it('contains the expected volume and all hero scenarios', () => {
    expect(rawData.visitors).toHaveLength(160);
    expect(rawData.visits.length).toBeGreaterThanOrEqual(850);
    expect(rawData.visits.length).toBeLessThanOrEqual(1000);
    expect(new Set(rawData.visitors.map((visitor) => visitor.scenario).filter(Boolean))).toEqual(new Set(Array.from({ length: 13 }, (_, index) => `H${index + 1}`)));
  });

  it('only blocks visitors with paid traffic at a threshold-crossing visit', () => {
    for (const visitor of rawData.visitors.filter((item) => ['blocked', 'pending', 'failed'].includes(item.status))) {
      const visits = rawData.visits.filter((visit) => visit.ip === visitor.ip);
      expect(visits.some((visit) => visit.source === 'paid')).toBe(true);
      const trigger = visits.find((visit) => visit.id === visitor.blockedAtVisitId);
      expect(trigger, visitor.ip).toBeDefined();
      expect(trigger!.scoreAfter, visitor.ip).toBeGreaterThanOrEqual(visitor.threshold);
    }
  });

  it('marks every visit after a block and none before it', () => {
    for (const visitor of rawData.visitors.filter((item) => item.blockedAt)) {
      for (const visit of rawData.visits.filter((item) => item.ip === visitor.ip)) {
        expect(visit.afterBlock, `${visitor.ip} ${visit.id}`).toBe(new Date(visit.startedAt).getTime() > new Date(visitor.blockedAt!).getTime());
      }
    }
  });

  it('has no paid visit after a successful platform exclusion', () => {
    for (const visitor of rawData.visitors) {
      for (const exclusion of visitor.exclusions.filter((item) => item.state === 'excluded' && item.at)) {
        const leaked = rawData.visits.filter((visit) => visit.ip === visitor.ip && visit.source === 'paid' && visit.platform === exclusion.platform && visit.startedAt > exclusion.at!);
        expect(leaked, `${visitor.ip} on ${exclusion.platform}`).toHaveLength(0);
      }
    }
  });

  it('never blocks organic-only traffic', () => {
    for (const visitor of rawData.visitors) {
      const visits = rawData.visits.filter((visit) => visit.ip === visitor.ip);
      if (visits.every((visit) => visit.source !== 'paid')) expect(['blocked', 'pending', 'failed']).not.toContain(visitor.status);
    }
  });

  it('derives wasted spend from paid clicks before the block', async () => {
    const { visitorViewModels } = await import('.');
    for (const visitor of visitorViewModels) {
      const expected = visitor.visits.filter((visit) => visit.source === 'paid' && (!visitor.blockedAt || visit.startedAt <= visitor.blockedAt)).reduce((sum, visit) => sum + (visit.cpc ?? 0), 0);
      expect(visitor.wastedSpend).toBeCloseTo(expected, 5);
    }
  });

  it('keeps fixed-seed output stable', async () => {
    const { createCrowd } = await import('./crowd');
    expect(createCrowd()).toEqual(createCrowd());
  });
});
