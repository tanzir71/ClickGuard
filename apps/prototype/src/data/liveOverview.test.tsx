import { StrictMode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  AccountOverview,
  advanceSpend,
  EMPTY_SPEND,
  getOverviewMetrics,
  getSpendOverviewMetrics,
  parseSpend,
  PROTECTION_STORAGE_KEY,
  SPEND_STORAGE_KEY,
  SPEND_TICK_MS,
  Stat,
  ThreatMonitor,
} from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '.';

// jsdom has no native top-layer dialog; real focus containment is verified in-browser.
const dialogPrototype = HTMLDialogElement.prototype;
const originalShow = Object.getOwnPropertyDescriptor(dialogPrototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(dialogPrototype, 'close');
beforeAll(() => {
  Object.defineProperty(dialogPrototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(dialogPrototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open');
    },
  });
});
afterAll(() => {
  if (originalShow) Object.defineProperty(dialogPrototype, 'showModal', originalShow);
  else Reflect.deleteProperty(dialogPrototype, 'showModal');
  if (originalClose) Object.defineProperty(dialogPrototype, 'close', originalClose);
  else Reflect.deleteProperty(dialogPrototype, 'close');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
const tick = () =>
  act(() => {
    vi.advanceTimersByTime(SPEND_TICK_MS);
  });
const storedSpend = () => parseSpend(sessionStorage.getItem(SPEND_STORAGE_KEY));
const card = (label: string) => screen.getByRole('button', { name: new RegExp('^' + label + ':') });
const headline = (label: string) => card(label).getAttribute('aria-label');
const sample = visitorViewModels.slice(0, 3);
const openPause = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Pause all protection' }));
  return within(screen.getByRole('alertdialog', { name: 'Pause all protection?' }));
};
const confirmPause = () => fireEvent.click(openPause().getByRole('button', { name: 'Pause all protection' }));

describe('protection-aware spend demo', () => {
  it('emphasizes only Wasted spend while paused and restores its normal appearance on resume', () => {
    const onView = vi.fn();
    const { rerender } = render(<AccountOverview visitors={sample} onView={onView} />);
    expect(card('Wasted spend').hasAttribute('data-emphasized')).toBe(false);
    rerender(<AccountOverview visitors={sample} protectionMode="paused" onView={onView} />);
    expect(card('Wasted spend').getAttribute('data-emphasized')).toBe('true');
    expect(document.querySelectorAll('[data-emphasized="true"]')).toHaveLength(1);
    expect(card('Wasted spend').textContent).toContain('Rising while paused · demo');
    fireEvent.mouseEnter(card('Wasted spend').parentElement!);
    expect(screen.getByRole('tooltip').textContent).toContain('Recorded cost + simulated waste');
    fireEvent.click(card('Wasted spend'));
    expect(onView).toHaveBeenCalledWith('wasted');
    rerender(<AccountOverview visitors={sample} protectionMode="active" onView={onView} />);
    expect(card('Wasted spend').hasAttribute('data-emphasized')).toBe(false);
    expect(card('Wasted spend').textContent).toContain('Recorded + demo impact');
  });

  it('routes each cost to exactly one bucket and preserves losses on resume', () => {
    const active = advanceSpend(EMPTY_SPEND, 'active');
    const paused = advanceSpend(active, 'paused');
    const resumed = advanceSpend(paused, 'active');
    expect(active).toEqual({ tick: 1, wastedCents: 0, protectedCents: 240 });
    expect(paused).toEqual({ tick: 2, wastedCents: 320, protectedCents: 240 });
    expect(resumed).toEqual({ tick: 3, wastedCents: 320, protectedCents: 420 });
    expect(EMPTY_SPEND.tick).toBe(0);
  });

  it('keeps H1–H13 counts record-derived and every monetary hover total reconciled', () => {
    const base = getOverviewMetrics(visitorViewModels);
    const original = JSON.stringify(base);
    let spend = EMPTY_SPEND;
    for (let index = 0; index < 100; index++) {
      spend = advanceSpend(spend, index % 3 ? 'paused' : 'active');
      const stats = getSpendOverviewMetrics(base, spend);
      expect([stats.visitors, stats.paid, stats.decisions, stats.review]).toEqual([
        base.visitors,
        base.paid,
        base.decisions,
        base.review,
      ]);
      expect(stats.wastedRows.reduce((sum, row) => sum + row.value, 0)).toBe(stats.wasted);
      expect(stats.protectedRows.reduce((sum, row) => sum + row.value, 0)).toBe(stats.protected);
    }
    expect(JSON.stringify(base)).toBe(original);
  });

  it.each([
    null,
    'broken',
    '[]',
    'null',
    '{"tick":-1,"wastedCents":2,"protectedCents":3}',
    '{"tick":0,"wastedCents":"2","protectedCents":3}',
  ])('safely rejects invalid session data: %s', (raw) => expect(parseSpend(raw)).toEqual(EMPTY_SPEND));

  it('grows Protected while active; paused grows Wasted and keeps live hover rows synchronized', () => {
    vi.useFakeTimers();
    const { rerender } = render(<AccountOverview visitors={sample} onView={() => undefined} />);
    const originalWaste = headline('Wasted spend');
    const originalProtected = headline('Protected');
    const originalVisitors = headline('Visitors');
    tick();
    expect(headline('Wasted spend')).toBe(originalWaste);
    expect(headline('Protected')).not.toBe(originalProtected);
    rerender(<AccountOverview visitors={sample} protectionMode="paused" onView={() => undefined} />);
    const heldProtection = headline('Protected');
    fireEvent.mouseEnter(card('Wasted spend').parentElement!);
    tick();
    expect(headline('Wasted spend')).not.toBe(originalWaste);
    expect(headline('Protected')).toBe(heldProtection);
    expect(headline('Visitors')).toBe(originalVisitors);
    const tooltip = within(screen.getByRole('tooltip'));
    expect(tooltip.getByText('Simulated waste while paused')).toBeDefined();
    expect(tooltip.getByText('$3.20')).toBeDefined();
    expect(tooltip.getByText(/this demo session/)).toBeDefined();
    rerender(<AccountOverview visitors={sample} protectionMode="active" onView={() => undefined} />);
    const heldWaste = headline('Wasted spend');
    tick();
    expect(headline('Wasted spend')).toBe(heldWaste);
    expect(headline('Protected')).not.toBe(heldProtection);
  });

  it('requires confirmation, keeps protection active while deciding, and cancels safely', () => {
    vi.useFakeTimers();
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    const dialog = openPause();
    expect(document.activeElement).toBe(dialog.getByRole('button', { name: 'Keep protection on' }));
    expect(dialog.getByText(/including existing exclusions/)).toBeDefined();
    fireEvent.keyDown(dialog.getByRole('button', { name: 'Keep protection on' }), {
      key: 'Tab',
      shiftKey: true,
    });
    expect(document.activeElement).toBe(dialog.getByRole('button', { name: 'Pause all protection' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(dialog.getByRole('button', { name: 'Keep protection on' }));
    tick();
    expect(storedSpend().protectedCents).toBe(240);
    expect(sessionStorage.getItem(PROTECTION_STORAGE_KEY)).toBe('active');
    fireEvent.click(dialog.getByRole('button', { name: 'Keep protection on' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Protection warning' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Pause all protection' }));
  });

  it('confirms pause with an alarm banner, then resumes in one click without resetting totals', () => {
    vi.useFakeTimers();
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    confirmPause();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('All protection paused')).toBeDefined();
    tick();
    expect(storedSpend().wastedCents).toBe(240);
    expect(storedSpend().protectedCents).toBe(0);
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Protection warning' })).getByRole('button', {
        name: 'Resume protection',
      }),
    );
    expect(screen.queryByRole('region', { name: 'Protection warning' })).toBeNull();
    tick();
    expect(storedSpend()).toEqual({ tick: 2, wastedCents: 240, protectedCents: 320 });
  });

  it('Escape cancels the modal without closing H3 details; backdrop cancels without pausing', () => {
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    fireEvent.click(screen.getByText('72.14.201.88', { exact: true }));
    openPause();
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('complementary')).toBeDefined();
    openPause();
    fireEvent.click(screen.getByRole('alertdialog'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(sessionStorage.getItem(PROTECTION_STORAGE_KEY)).toBe('active');
  });

  it('disables H3 manual blocking and bulk blocking, preserving H1 historical decisions', () => {
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    confirmPause();
    fireEvent.click(screen.getByText('72.14.201.88', { exact: true }));
    const panel = within(screen.getByRole('complementary'));
    expect((panel.getByRole('button', { name: 'Block now' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select 72.14.201.88' }));
    expect(
      screen
        .getAllByRole('button', { name: 'Block now' })
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    fireEvent.click(screen.getByText('185.220.101.4', { exact: true }));
    expect(
      within(screen.getByRole('complementary')).getByRole('button', { name: 'Always allow this IP' }),
    ).toBeDefined();
    expect(within(screen.getByRole('complementary')).getAllByText('Ⅱ Protection paused')).toHaveLength(2);
    expect(sample[0].status).toBe('blocked');
  });

  it('persists paused mode and both amounts across remounts without replaying elapsed time', () => {
    vi.useFakeTimers();
    const initial = render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    tick();
    confirmPause();
    tick();
    const before = storedSpend();
    initial.unmount();
    act(() => vi.advanceTimersByTime(60000));
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    expect(screen.getByText('All protection paused')).toBeDefined();
    expect(storedSpend()).toEqual(before);
    tick();
    expect(storedSpend().wastedCents).toBe(before.wastedCents + 180);
  });

  it('suspends hidden tabs without catching up missed ticks', () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    render(<AccountOverview visitors={sample} onView={() => undefined} />);
    tick();
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(60000));
    expect(storedSpend().tick).toBe(1);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    tick();
    expect(storedSpend().tick).toBe(2);
  });

  it.each([
    { visitors: [], enabled: true },
    { visitors: sample, enabled: false },
  ])('does not accumulate for an empty or disabled overview', (props) => {
    vi.useFakeTimers();
    render(<AccountOverview {...props} onView={() => undefined} />);
    act(() => vi.advanceTimersByTime(60000));
    expect(storedSpend()).toEqual(EMPTY_SPEND);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up its one timer under StrictMode and continues without sessionStorage', () => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    const { unmount } = render(
      <StrictMode>
        <AccountOverview visitors={sample} onView={() => undefined} />
      </StrictMode>,
    );
    expect(vi.getTimerCount()).toBe(1);
    const previous = headline('Protected');
    tick();
    expect(headline('Protected')).not.toBe(previous);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the H1–H3 table/funnel and session additions unchanged by filters or dates', () => {
    vi.useFakeTimers();
    render(<ThreatMonitor visitors={sample} now={FIXED_NOW} />);
    const table = screen.getByRole('table', { name: 'Threat monitoring results' });
    const funnel = screen.getByRole('region', { name: 'Traffic evaluation' });
    const tableBefore = table.innerHTML;
    const funnelBefore = funnel.innerHTML;
    tick();
    expect(table.innerHTML).toBe(tableBefore);
    expect(funnel.innerHTML).toBe(funnelBefore);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search visitors' }), {
      target: { value: 'no-match' },
    });
    fireEvent.click(screen.getByText(/Last 30 days/));
    expect(storedSpend().protectedCents).toBe(240);
    expect(headline('Visitors')).toContain('Visitors: 3.');
  });

  it('provides exact accessible values while digits animate', () => {
    const { rerender } = render(<Stat label="Protected" value="~$100" animate />);
    rerender(<Stat label="Protected" value="~$103" animate />);
    expect(screen.getByText('~$103', { selector: 'span' })).toBeDefined();
    expect(screen.getByText('~$103', { selector: 'span' }).className).toContain('srOnly');
  });
});
