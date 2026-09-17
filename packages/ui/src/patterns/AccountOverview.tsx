import { useMemo } from 'react';
import { ScanEye, ShieldBan, ShieldCheck, Users, Wallet } from 'lucide-react';
import type { VisitorVM } from '../model';
import { Stat } from '../data/Stat';
import { getOverviewMetrics } from '../data/overview';
import { EMPTY_SPEND, getSpendOverviewMetrics, type ProtectionMode } from '../data/protectionSimulation';
import { useSpendSimulation } from './useProtectionDemo';
import styles from '../styles/ClickGuard.module.css';

export function AccountOverview({ visitors, enabled = true, protectionMode = 'active', onView }: {
  visitors: VisitorVM[];
  enabled?: boolean;
  protectionMode?: ProtectionMode;
  onView: (view: 'all' | 'blocked' | 'review' | 'wasted') => void;
}) {
  const available = enabled && visitors.length > 0;
  const { spend, running, lastChange } = useSpendSimulation(protectionMode, available);
  const base = useMemo(() => getOverviewMetrics(visitors), [visitors]);
  const stats = getSpendOverviewMetrics(base, visitors.length ? spend : EMPTY_SPEND);
  const paused = protectionMode === 'paused';
  const delta = lastChange ? `+$${(lastChange.cents / 100).toFixed(2)}` : undefined;
  const scope = 'Recorded account snapshot · independent of table filters';
  const spendScope = 'Recorded snapshot + simulated impact this demo session. Demo additions are not visitor records or included in exports.';

  return <section className={styles.statsOverview} aria-label="Threat monitoring summary">
    <header className={styles.statsHeading}>
      <div className={styles.statsTitle}><h2>Account overview</h2><span className={styles.liveBadge} data-running={running && !paused}><i aria-hidden="true" />{running ? 'Spend demo' : 'Snapshot'}</span></div>
      <span>Visitor counts are recorded · money includes simulated impact</span>
    </header>
    <div className={styles.statsGrid}>
      <Stat label="Visitors" value={stats.visitors.toLocaleString()} animate
        caption={`${stats.paid.toLocaleString()} with paid traffic`} icon={<Users />}
        actionLabel="View snapshot visitors" onClick={() => onView('all')}
        breakdown={{ title: 'Visitor mix', rows: stats.trafficRows,
          note: 'Each recorded visitor is counted once. Paid includes visitors with both paid and unpaid visits.', scope }} />
      <Stat label="Block decisions" value={stats.decisions.toLocaleString()} animate
        caption={`${stats.blocked} blocked · ${stats.pending + stats.failed} unresolved`} tone="danger" icon={<ShieldBan />}
        actionLabel="View snapshot block decisions" onClick={() => onView('blocked')}
        breakdown={{ title: 'Recorded block outcomes', rows: stats.decisionRows,
          note: paused ? 'Historical decisions are unchanged. All enforcement is currently paused in this demo.' : 'Pending and failed exclusions are decisions, not confirmed blocks on every platform.', scope }} />
      <Stat label="Needs review" value={stats.review.toLocaleString()} animate caption="visitors in your review queue"
        tone="warning" icon={<ScanEye />} actionLabel="Open snapshot review queue" onClick={() => onView('review')}
        breakdown={{ title: 'Review queue', rows: stats.reviewRows,
          note: 'Includes monitoring, failed exclusions, and recent blocks flagged for review. Marking reviewed removes the recorded visitor from this queue.', scope }} />
      <Stat label="Wasted spend" value={`$${Math.round(stats.wasted).toLocaleString()}`} animate
        change={paused ? delta : undefined} caption={paused ? 'Rising while paused · demo' : 'Recorded + demo impact'}
        tone="danger" icon={<Wallet />} actionLabel="View snapshot spend over $20" onClick={() => onView('wasted')}
        breakdown={{ title: 'Recorded cost + simulated waste', rows: stats.wastedRows,
          note: 'Recorded rows show pre-block paid click cost, or paid cost so far if never blocked. The simulated row grows only while protection is paused; it is illustrative, not a measured loss. USD · headline rounded.', scope: spendScope }} />
      <Stat label="Protected" value={`~$${Math.round(stats.protected).toLocaleString()}`} animate
        change={!paused ? delta : undefined} caption={paused ? 'On hold · protection paused' : 'Growing while active · demo'}
        tone={paused ? 'default' : 'success'} icon={<ShieldCheck />}
        breakdown={{ title: 'Estimated + simulated protection', rows: stats.protectedRows,
          note: 'Snapshot estimate: 2.05× pre-block spend, capped at $280 per blocked visitor. The separate simulated row grows only while protection is active. Neither is measured savings or recovered revenue. USD · headline rounded.', scope: spendScope }} />
    </div>
  </section>;
}
