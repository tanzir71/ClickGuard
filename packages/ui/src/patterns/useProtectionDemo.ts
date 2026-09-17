import { useEffect, useState } from 'react';
import {
  advanceSpend, parseSpend, PROTECTION_STORAGE_KEY, SPEND_STORAGE_KEY, SPEND_TICK_MS,
  type ProtectionMode,
} from '../data/protectionSimulation';

function readStorage(key: string) {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function writeStorage(key: string, value: string) {
  try { window.sessionStorage.setItem(key, value); } catch { /* In-memory demo still works. */ }
}
export function useProtectionMode() {
  const [mode, setMode] = useState<ProtectionMode>(() => (
    readStorage(PROTECTION_STORAGE_KEY) === 'paused' ? 'paused' : 'active'
  ));
  useEffect(() => writeStorage(PROTECTION_STORAGE_KEY, mode), [mode]);
  return [mode, setMode] as const;
}

/** Keep spend updates inside the overview, away from the traffic table. */
export function useSpendSimulation(mode: ProtectionMode, enabled: boolean) {
  const [{ spend, lastChange }, setState] = useState(() => ({
    spend: parseSpend(readStorage(SPEND_STORAGE_KEY)),
    lastChange: null as { mode: ProtectionMode; cents: number } | null,
  }));
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => writeStorage(SPEND_STORAGE_KEY, JSON.stringify(spend)), [spend]);
  const running = enabled && visible;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setState((current) => {
        const next = advanceSpend(current.spend, mode);
        const cents = next.wastedCents + next.protectedCents - current.spend.wastedCents - current.spend.protectedCents;
        return { spend: next, lastChange: { mode, cents } };
      });
    }, SPEND_TICK_MS);
    return () => window.clearInterval(timer);
  }, [running, mode]);
  return { spend, running, lastChange: running && lastChange?.mode === mode ? lastChange : null };
}
