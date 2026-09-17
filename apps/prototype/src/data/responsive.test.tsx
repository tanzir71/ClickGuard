import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Stat, ThreatMonitor } from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '.';

let compact = true;
const listeners = new Set<() => void>();
beforeEach(() => {
  compact = true;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: compact,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  listeners.clear();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

const blocked = visitorViewModels.find((visitor) => visitor.ip === '185.220.101.4')!;
const monitored = visitorViewModels.find((visitor) => visitor.ip === '72.14.201.88')!;

describe('responsive visitor flows', () => {
  it('opens a compact details dialog, locks background scrolling and closes with Escape', () => {
    render(<ThreatMonitor visitors={[blocked, monitored]} now={FIXED_NOW} />);
    const trigger = screen.getByText(blocked.ip, { exact: true });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: `Visitor ${blocked.ip} details` });
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(dialog).getByRole('button', { name: 'Unblock' })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    expect(screen.getByRole('dialog', { name: `Visitor ${blocked.ip} details` })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('moves between compact details and full journey without leaving duplicate modals or a scroll lock', () => {
    window.history.replaceState({}, '', `/?visitor=${blocked.ip}`);
    render(<ThreatMonitor visitors={[blocked]} now={FIXED_NOW} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open full journey →' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: `Full journey for ${blocked.ip}` })).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: `Visitor ${blocked.ip} details` })).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(document.body.style.overflow).toBe('');
  });

  it('preserves the selected visitor when resizing to desktop and releases the mobile scroll lock', () => {
    window.history.replaceState({}, '', `/?visitor=${blocked.ip}`);
    render(<ThreatMonitor visitors={[blocked]} now={FIXED_NOW} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    act(() => {
      compact = false;
      listeners.forEach((listener) => listener());
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('complementary', { name: `Visitor ${blocked.ip} details` })).toBeTruthy();
    expect(document.body.style.overflow).toBe('');
  });

  it('supports compact sorting and selection without relying on the desktop table header', () => {
    render(<ThreatMonitor visitors={[blocked, monitored]} now={FIXED_NOW} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort visitors' }), {
      target: { value: 'risk:asc' },
    });
    expect(screen.getAllByRole('row')[1].textContent).toContain(monitored.ip);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all visitors' }));
    expect(screen.getByText('2 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText('2 selected')).toBeNull();
  });

  it('confirms and applies manual unblocking from the mobile detail dialog', () => {
    window.history.replaceState({}, '', `/?visitor=${blocked.ip}`);
    render(<ThreatMonitor visitors={[blocked]} now={FIXED_NOW} />);
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Unblock' }));
    expect(dialog.getByText(`Unblock ${blocked.ip}?`)).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: 'Unblock' }));
    expect(dialog.getByText(/Manually unblocked by Tanzir/)).toBeTruthy();
    expect(dialog.getByRole('button', { name: 'Block now' })).toBeTruthy();
  });

  it('opens breakdowns by tap without triggering the metric filter', () => {
    const onClick = vi.fn();
    render(
      <Stat
        label="Visitors"
        value="12"
        onClick={onClick}
        breakdown={{ title: 'Visitor breakdown', rows: [{ label: 'Paid', value: 12 }] }}
      />,
    );
    const info = screen.getByRole('button', { name: 'Visitors breakdown' });
    fireEvent.click(info);
    expect(screen.getByRole('tooltip').textContent).toContain('Visitor breakdown');
    expect(info.getAttribute('aria-expanded')).toBe('true');
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(info);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Visitors: 12/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
