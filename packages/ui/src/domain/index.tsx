import { useState } from 'react';
import { AlertTriangle, Check, Eye, LoaderCircle, ShieldCheck, ShieldX, TrendingDown, TrendingUp } from 'lucide-react';
import type { ExclusionVM, Platform, SignalVM, Source, VisitVM, VisitorVM, VisitorStatus } from '../model';
import { KeyValue } from '../data';
import { Button } from '../primitives';
import { buildDecisionRoute } from './journeyNarrative';
import styles from '../styles/ClickGuard.module.css';

export { VisitRibbon } from './VisitRibbon';
export { buildVisitJourney } from './visitJourney';
export { RiskChart } from './RiskChart';
export { buildJourneyNarrative, describeJourneyVisit, keyRecordedEvents } from './journeyNarrative';

const statusMeta: Record<VisitorStatus, { label: string; icon: typeof Check }> = {
  blocked: { label: 'Blocked', icon: ShieldX }, monitoring: { label: 'Monitoring', icon: Eye }, clean: { label: 'Clean', icon: Check },
  allowed: { label: 'Always allowed', icon: ShieldCheck }, pending: { label: 'Blocking…', icon: LoaderCircle }, failed: { label: 'Exclusion failed', icon: AlertTriangle },
};
const platformShort: Record<Platform, string> = { google_ads: 'G', meta_ads: 'M', microsoft_ads: 'MS' };
const platformLabel: Record<Platform, string> = { google_ads: 'Google Ads', meta_ads: 'Meta Ads', microsoft_ads: 'Microsoft Ads' };

export function StatusPill({ status, size = 'sm', withPlatforms = [] }: { status: VisitorStatus; size?: 'sm' | 'md'; withPlatforms?: Platform[] }) {
  const meta = statusMeta[status]; const Icon = meta.icon;
  return <span className={`${styles.statusPill} ${styles[`status-${status}`]} ${styles[`pill-${size}`]}`}><Icon className={status === 'pending' ? styles.spin : ''} aria-hidden="true" />{meta.label}{withPlatforms.map((platform) => <span className={styles.platformMini} key={platform}>{platformShort[platform]}</span>)}</span>;
}

export function SourceTag({ source, platform, warning = false }: { source: Source; platform?: Platform; warning?: boolean }) {
  const label = source === 'paid' ? `Paid${platform ? ` · ${platformLabel[platform]}` : ''}` : source[0].toUpperCase() + source.slice(1);
  return <span className={`${styles.sourceTag} ${styles[`source-${source}`]} ${warning ? styles.sourceWarning : ''}`}><i />{label}</span>;
}

export function RiskScore({ value, threshold = 70, variant = 'inline', delta }: { value?: number; threshold?: number; variant?: 'inline' | 'gauge'; delta?: number }) {
  if (value === undefined) return <span>—</span>;
  const band = value >= threshold ? 'high' : value >= 40 ? 'elevated' : 'low';
  return <div className={`${styles.riskScore} ${styles[`risk-${variant}`]}`} aria-label={`Risk score ${value} of 100, ${band}`}><strong>{value}</strong><span className={styles.riskTrack}><i className={styles[`riskBand-${band}`]} style={{ width: `${value}%` }} /><b style={{ left: `${threshold}%` }} /></span><small>{delta ? `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} today` : band}</small></div>;
}

export function SignalBar({ signal }: { signal: SignalVM }) {
  const lowering = signal.points < 0;
  return <div className={`${styles.signalBar} ${lowering ? styles.signalLowers : styles[`signal-${signal.severity}`]}`}>
    <span className={styles.signalIcon}>{lowering ? <TrendingDown /> : <TrendingUp />}</span><span><strong>{signal.label}</strong><small>{signal.value}</small></span><b>{signal.points > 0 ? '+' : ''}{signal.points}</b><i style={{ width: `${Math.min(100, Math.abs(signal.points) * 3)}%` }} />
  </div>;
}

export function SignalMeter({ label, value, level = 0, tone = 'neutral' }: { label: string; value: string; level?: number; tone?: 'neutral' | 'warning' | 'danger' | 'success' }) {
  return <div className={`${styles.signalMeter} ${styles[`meter-${tone}`]}`}><span>{label}</span><strong>{value}</strong><div>{Array.from({ length: 4 }, (_, index) => <i key={index} data-active={index < level} />)}</div></div>;
}

export function VerdictCard({ status, sentence, meta }: { status: VisitorStatus; sentence: string; meta: string }) {
  return <div className={`${styles.verdict} ${styles[`verdict-${status}`]}`}><header><StatusPill status={status} size="md" /><strong>{meta}</strong></header><p>{sentence.split(/(\d+(?:\.\d+)?%?)/g).map((part, index) => /^\d/.test(part) ? <strong key={index}>{part}</strong> : part)}</p></div>;
}

export function ExclusionList({ rows, onRetry, protectionPaused = false }: { rows: ExclusionVM[]; onRetry?: () => void; protectionPaused?: boolean }) {
  const [connectionNotice, setConnectionNotice] = useState('');
  if (!rows.length) return <p className={styles.muted}>Not on any exclusion list.</p>;
  return <div className={styles.exclusionList}>{rows.map((row) => <div key={row.platform} className={styles.exclusionRow}><span className={styles.platformGlyph}>{platformShort[row.platform]}</span><span><strong>{platformLabel[row.platform]}</strong><small>{row.error ?? (row.state === 'if_blocked' ? 'If risk crosses the block threshold' : row.state === 'not_connected' ? 'Connect to protect future paid visits' : 'All active campaigns')}</small></span><span className={styles[`exclusion-${protectionPaused && ['excluded', 'syncing', 'failed'].includes(row.state) ? 'failed' : row.state}`]}>{protectionPaused && ['excluded', 'syncing', 'failed'].includes(row.state) ? 'Ⅱ Protection paused' : row.state === 'if_blocked' ? 'If blocked' : row.state === 'excluded' ? '✓ Excluded' : row.state === 'syncing' ? '◌ Syncing' : row.state === 'failed' ? '! Failed' : row.state === 'removed' ? '↺ Removed' : '— Not connected'}<small>{row.at ? new Date(row.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</small>{row.state === 'not_connected' && <Button variant="link" size="sm" onClick={() => setConnectionNotice('Demo: connections are mocked')}>Connect</Button>}{row.state === 'failed' && <Button variant="link" size="sm" disabled={protectionPaused} onClick={onRetry}>Retry</Button>}</span></div>)}{connectionNotice && <p role="status">{connectionNotice}</p>}</div>;
}

export function DecisionRoute({ visits, blockedAtVisitId, exclusions, allowedBy, threshold = 70, status = 'monitoring' }: {
  visits: VisitVM[]; blockedAtVisitId?: string; exclusions: ExclusionVM[]; allowedBy?: { user: string; at: string; note?: string }; threshold?: number; status?: VisitorStatus;
}) {
  const nodes = buildDecisionRoute({ visits, blockedAtVisitId, exclusions, allowedBy, threshold, status });
  return <div className={styles.decisionRoute}>{nodes.map((node, index) => <div key={index} data-prospective={node.prospective}><i>{node.icon}</i><span><strong>{node.title}</strong><small>{node.sub}</small></span></div>)}</div>;
}

export function SpendReceipt({ visitor }: { visitor: VisitorVM }) {
  const paid = visitor.visits.filter((visit) => visit.source === 'paid');
  if (!paid.length) return <p className={styles.muted}>No ad spend: this visitor never clicked an ad.</p>;
  const blocked = ['blocked', 'pending', 'failed'].includes(visitor.status);
  const counted = blocked ? paid.filter((visit) => !visitor.blockedAt || visit.startedAt <= visitor.blockedAt) : paid;
  const total = counted.reduce((sum, visit) => sum + (visit.cpc ?? 0), 0);
  const since = paid.filter((visit) => visitor.blockedAt && visit.startedAt > visitor.blockedAt);
  const failedPlatforms = new Set(visitor.exclusions.filter((row) => row.state === 'failed').map((row) => row.platform));
  const leaked = since.some((visit) => visit.platform && failedPlatforms.has(visit.platform));
  const monitoring = visitor.status === 'monitoring';
  return <dl className={styles.receipt}>
    <KeyValue label={blocked ? `${counted.length} paid ${counted.length === 1 ? 'click' : 'clicks'} before block` : monitoring ? `${paid.length} paid ${paid.length === 1 ? 'click' : 'clicks'} so far` : 'Spend on this visitor'} value={`$${total.toFixed(2)}`} />
    {(blocked || monitoring) && Object.entries(platformLabel).map(([platform, label]) => {
      const visits = counted.filter((visit) => visit.platform === platform);
      return visits.length ? <KeyValue key={platform} label={label} value={`${visits.length} ${visits.length === 1 ? 'click' : 'clicks'} · $${visits.reduce((sum, visit) => sum + (visit.cpc ?? 0), 0).toFixed(2)}`} /> : null;
    })}
    {blocked && <><KeyValue label="Paid clicks since block" value={since.length} tone={leaked ? 'danger' : since.length ? 'default' : 'success'} /><KeyValue label="Protected (est.)" value={`~$${visitor.protectedSpendEst.toFixed(0)} / 7d`} /></>}
    {!blocked && !monitoring && visitor.conversions > 0 && <KeyValue label="Conversion value" value={`${visitor.conversions} ${visitor.visits.filter((visit) => visit.conversion).every((visit) => visit.conversion?.type === 'purchase') ? visitor.conversions === 1 ? 'purchase' : 'purchases' : visitor.conversions === 1 ? 'conversion' : 'conversions'} · $${visitor.conversionValueTotal.toFixed(0)}`} />}
    {(blocked || monitoring) && <div className={styles.receiptTotal} data-monitoring={monitoring}><dt>{monitoring ? 'Spent so far' : 'Wasted'}</dt><dd>${total.toFixed(2)}</dd></div>}
  </dl>;
}

export function EventTimeline({ events, density = 'comfortable' }: { events: VisitVM['events']; density?: 'compact' | 'comfortable' }) {
  const [expanded, setExpanded] = useState(false); const shown = expanded ? events : events.slice(0, 8);
  if (!events.length) return <div className={styles.noBehavior}>No behaviour recorded: the tracking tag didn’t run on this visit.</div>;
  return <div className={`${styles.eventTimeline} ${styles[`events-${density}`]}`}>{shown.map((event, index) => <div key={`${event.t}-${index}`}><time>+{(event.t / 1000).toFixed(3)}s</time><i>{event.kind === 'signal' ? '⚑' : event.kind === 'conversion' ? '$' : '•'}</i><span>{event.label}</span></div>)}{events.length > 8 && <Button variant="link" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : `Show ${events.length - 8} more`}</Button>}</div>;
}

export function BehaviorScrubber({ visit }: { visit: VisitVM }) {
  if (!visit.jsExecuted) return <div className={styles.noBehavior}>No behaviour recorded · tag didn’t load (ad blocker or non-JavaScript bot)</div>;
  return <div className={styles.scrubber} aria-label={`Activity over ${formatDuration(visit.durationMs)}`}><div>{visit.activityBuckets.map((value, index) => <i key={index} data-level={Math.ceil(value * 3)} />)}</div><footer><span>0s</span><span>{formatDuration(visit.durationMs)}</span></footer></div>;
}

export function ScoreWaterfall({ visit, threshold }: { visit: VisitVM; threshold: number }) {
  const end = visit.scoreAfter;
  return <div className={styles.waterfall}><div className={styles.waterfallTotal}><span>Score before this visit</span><strong>{visit.scoreBefore}</strong></div>{visit.signals.length ? visit.signals.map((signal) => <SignalBar key={`${signal.id}-${signal.points}`} signal={signal} />) : <p className={styles.muted}>No score-changing signals on this visit.</p>}<div className={styles.waterfallTotal}><span>Score after this visit</span><strong>{end} {visit.scoreBefore < threshold && end >= threshold ? `◆ crossed ${threshold}` : ''}</strong></div><p className={styles.waterfallNote}>Signals are capped by category. Scores decay after seven inactive days.</p></div>;
}

export function platformName(platform?: Platform) { return platform ? platformLabel[platform] : ''; }
export function shortTime(value: string) { return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
export function formatDuration(ms: number) { return ms < 10000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`; }
