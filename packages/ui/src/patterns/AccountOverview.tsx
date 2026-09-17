import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, ScanEye, ShieldBan, ShieldCheck, Users, Wallet } from 'lucide-react';
import type { VisitorVM } from '../model';
import { Stat } from '../data/Stat';
import { getOverviewMetrics } from '../data/overview';
import { getLiveOverviewMetrics, OVERVIEW_DEMO_BATCHES } from '../data/liveOverview';
import styles from '../styles/ClickGuard.module.css';

export function AccountOverview({ visitors, enabled = true, onView }: {
  visitors: VisitorVM[];
  enabled?: boolean;
  onView: (view: 'all' | 'blocked' | 'review' | 'wasted') => void;
}) {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const available = enabled && visitors.length > 0;
  const running = available && !paused && visible;
  const base = useMemo(() => getOverviewMetrics(visitors), [visitors]);
  const stats = getLiveOverviewMetrics(base, available ? tick : 0);
  const previous = getLiveOverviewMetrics(base, available ? tick - 1 : 0);

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setTick((value) => value + 1), OVERVIEW_DEMO_BATCHES[tick % OVERVIEW_DEMO_BATCHES.length].delay);
    return () => window.clearTimeout(timer);
  }, [running, tick]);

  const change = (key: 'visitors' | 'decisions' | 'review' | 'wasted' | 'protected', money = false) => {
    const delta = Math.round(stats[key]) - Math.round(previous[key]);
    return running && tick > 0 && delta > 0 ? `+${money ? '$' : ''}${delta.toLocaleString()}` : undefined;
  };
  const scope = available ? 'Recorded snapshot + simulated activity · table filters apply to the snapshot only' : 'Recorded snapshot · independent of table filters';

  return <section className={styles.statsOverview} aria-label="Threat monitoring summary">
    <header className={styles.statsHeading}>
      <div className={styles.statsTitle}><h2>Account overview</h2><span className={styles.liveBadge} data-running={running}><i aria-hidden="true" />{running ? 'Live demo' : available ? 'Demo paused' : 'Snapshot'}</span></div>
      <div className={styles.statsControls}><span>{available ? 'Simulated activity · table stays a snapshot' : 'Recorded snapshot · live demo inactive'}</span><button type="button" disabled={!available} onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Resume live demo' : 'Pause live demo'}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? 'Resume' : 'Pause'}</button></div>
    </header>
    <div className={styles.statsGrid}>
      <Stat label="Visitors" value={stats.visitors.toLocaleString()} animate change={change('visitors')} caption={`${stats.paid.toLocaleString()} with paid traffic`} icon={<Users />} actionLabel="View snapshot visitors" onClick={() => onView('all')} breakdown={{ title: 'Visitor mix', rows: stats.trafficRows, note: 'Each visitor is counted once. Paid includes visitors with both paid and unpaid visits.', scope }} />
      <Stat label="Block decisions" value={stats.decisions.toLocaleString()} animate change={change('decisions')} caption={`${stats.blocked} blocked · ${stats.pending + stats.failed} unresolved`} tone="danger" icon={<ShieldBan />} actionLabel="View snapshot block decisions" onClick={() => onView('blocked')} breakdown={{ title: 'Block outcomes', rows: stats.decisionRows, note: 'Pending and failed exclusions are decisions, not confirmed blocks on every platform.', scope }} />
      <Stat label="Needs review" value={stats.review.toLocaleString()} animate change={change('review')} caption="visitors in your review queue" tone="warning" icon={<ScanEye />} actionLabel="Open snapshot review queue" onClick={() => onView('review')} breakdown={{ title: 'Review queue', rows: stats.reviewRows, note: 'Includes monitoring, failed exclusions, and recent blocks flagged for review. Marking reviewed removes the recorded visitor from this queue.', scope }} />
      <Stat label="Wasted spend" value={`$${Math.round(stats.wasted).toLocaleString()}`} animate change={change('wasted', true)} caption="pre-block click cost" tone="danger" icon={<Wallet />} actionLabel="View snapshot spend over $20" onClick={() => onView('wasted')} breakdown={{ title: 'Click cost by visitor status', rows: stats.wastedRows, note: 'Paid clicks before a block, or all paid clicks if no block exists, plus illustrative demo clicks. Not a confirmed fraud-loss total. USD · headline rounded.', scope }} />
      <Stat label="Protected" value={`~$${Math.round(stats.protected).toLocaleString()}`} animate change={change('protected', true)} caption="estimated prevented spend" tone="success" icon={<ShieldCheck />} breakdown={{ title: 'Estimated protection by network', rows: stats.protectedRows, note: 'Demo estimate: 2.05× pre-block spend, capped at $280 per blocked visitor. Includes simulated activity, not measured savings or recovered revenue. USD · headline rounded.', scope }} />
    </div>
  </section>;
}
