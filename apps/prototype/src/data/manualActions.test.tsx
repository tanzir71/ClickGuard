import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  PROTECTION_STORAGE_KEY,
  ThreatMonitor,
  applyVisitorAction,
  buildDecisionRoute,
  buildJourneyNarrative,
} from '@clickguard/ui';
import { FIXED_NOW, rawData, visitorViewModels } from '.';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
const hero = (name: string) =>
  visitorViewModels.find(
    (visitor) => visitor.ip === rawData.visitors.find((item) => item.scenario === name)!.ip,
  )!;
const details = () => within(screen.getByRole('complementary'));
function openActions(ip: string) {
  const trigger = screen.getByLabelText(`Actions for ${ip}`);
  fireEvent.click(trigger);
  return within(trigger.closest('details')!);
}

describe('manual enforcement is separate from risk and permanent allowance', () => {
  it.each(['H1', 'H3', 'H6', 'H7', 'H8', 'H9'])('blocks %s without rewriting evidence', (name) => {
    const before = hero(name);
    const blocked = applyVisitorAction(before, 'block', FIXED_NOW);
    expect(blocked.status).toBe('blocked');
    expect(blocked.riskScore).toBe(before.riskScore);
    expect(blocked.visits).toBe(before.visits);
    expect(blocked.topSignals).toBe(before.topSignals);
    expect(blocked.blockedAtVisitId).toBe(before.blockedAtVisitId);
    expect(blocked.allowedBy).toBeUndefined();
    expect(blocked.exclusions.filter((row) => row.state === 'excluded').map((row) => row.platform)).toEqual([
      'google_ads',
      'meta_ads',
    ]);
    expect(blocked.exclusions.find((row) => row.platform === 'microsoft_ads')?.state).not.toBe('excluded');
    expect(blocked.verdict).toContain('Manually blocked');
  });

  it.each(['H1', 'H7', 'H8'])(
    'unblocks %s including pending/failed platforms without whitelisting',
    (name) => {
      const before = hero(name);
      const unblocked = applyVisitorAction(before, 'unblock', FIXED_NOW);
      expect(unblocked.status).toBe('monitoring');
      expect(unblocked.allowedBy).toBeUndefined();
      expect(unblocked.exclusions.some((row) => ['excluded', 'syncing', 'failed'].includes(row.state))).toBe(
        false,
      );
      expect(unblocked.exclusions.some((row) => row.error)).toBe(false);
      expect(unblocked.visits).toBe(before.visits);
      expect(unblocked.blockedAtVisitId).toBe(before.blockedAtVisitId);
      expect(buildJourneyNarrative(unblocked).headline).toContain('Manually unblocked');
      expect(buildDecisionRoute(unblocked).at(-1)?.title).toContain('Manually unblocked');
    },
  );

  it('records a manual block independently, never inventing a threshold crossing', () => {
    const blocked = applyVisitorAction(hero('H9'), 'block', FIXED_NOW);
    const story = buildJourneyNarrative(blocked);
    expect(story.decision).toBeUndefined();
    expect(story.chapters.at(-1)?.title).toBe('Manually blocked by Tanzir');
    expect(buildDecisionRoute(blocked).some((node) => node.title.includes('Threshold crossed'))).toBe(false);
    expect(buildDecisionRoute(blocked).some((node) => node.title === 'Excluded from ads')).toBe(false);
    expect(buildDecisionRoute(blocked).at(-1)?.title).toContain('Manually blocked');
  });

  it('removes an allowance without secretly blocking the visitor', () => {
    const result = applyVisitorAction(hero('H6'), 'remove_allowance', FIXED_NOW);
    expect(result.status).toBe('monitoring');
    expect(result.allowedBy).toBeUndefined();
    expect(result.exclusions.some((row) => row.state === 'excluded')).toBe(false);
    expect(result.verdict).toContain('has not been manually blocked');
  });
});

describe('visitor blocking controls', () => {
  it('offers row Block, confirms, updates the panel, unblocks and supports Undo', () => {
    const visitor = hero('H9');
    render(<ThreatMonitor visitors={[visitor]} now={FIXED_NOW} />);
    fireEvent.click(openActions(visitor.ip).getByRole('button', { name: 'Block now' }));
    expect(details().getByText(`Block now ${visitor.ip}?`)).toBeTruthy();
    expect(document.activeElement).toBe(details().getByRole('button', { name: 'Cancel' }));
    fireEvent.click(details().getByRole('button', { name: 'Cancel' }));
    expect(details().queryByText(/Manually blocked by/)).toBeNull();
    fireEvent.click(details().getByRole('button', { name: 'Block now' }));
    fireEvent.click(details().getByRole('button', { name: 'Block now' }));
    expect(details().getByText(/Manually blocked by Tanzir/)).toBeTruthy();
    expect(details().getByText(`Tanzir · ${visitor.riskScore}`)).toBeTruthy();
    fireEvent.click(openActions(visitor.ip).getByRole('button', { name: 'Unblock' }));
    expect(details().getByText(/future activity can trigger another block/)).toBeTruthy();
    fireEvent.click(details().getByRole('button', { name: 'Unblock' }));
    expect(details().getByText(/Manually unblocked by Tanzir/)).toBeTruthy();
    expect(details().getByRole('button', { name: 'Block now' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(details().getByRole('button', { name: 'Unblock' })).toBeTruthy();
  });

  it('keeps Always allow distinct and removes an allowance without a block', () => {
    const visitor = hero('H1');
    render(<ThreatMonitor visitors={[visitor]} now={FIXED_NOW} />);
    fireEvent.click(openActions(visitor.ip).getByRole('button', { name: 'Always allow this IP' }));
    fireEvent.click(details().getByRole('button', { name: 'Always allow' }));
    expect(details().getByText(/Automatic blocking is disabled/)).toBeTruthy();
    fireEvent.click(details().getByRole('button', { name: 'Remove allowance' }));
    expect(details().getByText(/does not manually block/)).toBeTruthy();
    fireEvent.click(details().getByRole('button', { name: 'Remove allowance' }));
    expect(details().getByText(/Automatic monitoring has resumed/)).toBeTruthy();
    expect(details().getByRole('button', { name: 'Block now' })).toBeTruthy();
  });

  it('disables new manual blocks while paused but still permits unblocking', () => {
    sessionStorage.setItem(PROTECTION_STORAGE_KEY, 'paused');
    const blocked = hero('H1');
    const clean = hero('H9');
    render(<ThreatMonitor visitors={[blocked, clean]} now={FIXED_NOW} />);
    const blockButton = openActions(clean.ip).getByRole('button', { name: 'Block now' });
    expect((blockButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(openActions(blocked.ip).getByRole('button', { name: 'Unblock' }));
    fireEvent.click(details().getByRole('button', { name: 'Unblock' }));
    expect(details().getByText(/Manually unblocked by/)).toBeTruthy();
    expect((details().getByRole('button', { name: 'Block now' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers the same IP actions in the visits table and full journey', () => {
    const visitor = hero('H1');
    render(<ThreatMonitor visitors={[visitor]} now={FIXED_NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Visits' }));
    const trigger = screen.getByLabelText(`Actions for ${visitor.ip} visit ${visitor.visits[0].id}`);
    fireEvent.click(trigger);
    fireEvent.click(within(trigger.closest('details')!).getByRole('button', { name: 'Unblock' }));
    fireEvent.click(details().getByRole('button', { name: 'Cancel' }));
    fireEvent.click(details().getByRole('button', { name: 'Open full journey →' }));
    const sheet = within(screen.getByRole('dialog'));
    fireEvent.click(sheet.getByRole('button', { name: 'Unblock' }));
    expect(details().getByText(`Unblock ${visitor.ip}?`)).toBeTruthy();
  });

  it('bulk unblocks only blocked selections, leaving allowances intact', () => {
    const blocked = hero('H1');
    const allowed = hero('H6');
    render(<ThreatMonitor visitors={[blocked, allowed]} now={FIXED_NOW} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all visible visitors' }));
    fireEvent.click(
      within(screen.getByText('2 selected').parentElement!).getByRole('button', {
        name: 'Unblock',
      }),
    );
    expect(openActions(blocked.ip).getByRole('button', { name: 'Block now' })).toBeTruthy();
    expect(openActions(allowed.ip).getByRole('button', { name: 'Remove allowance' })).toBeTruthy();
    expect(screen.getByText('1 visitor updated · demo only')).toBeTruthy();
  });
});
