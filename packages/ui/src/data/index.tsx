import { useId, useState, type ReactNode } from 'react';
import { AlertCircle, Inbox, Radar, SearchX } from 'lucide-react';
import styles from '../styles/ClickGuard.module.css';
import { Button } from '../primitives';
import {
  formatFunnelPercent,
  getFunnelMetrics,
  getFunnelProfile,
  type ActivityFunnelStage,
} from './activityFunnel';
export type { ActivityFunnelStage } from './activityFunnel';
export {
  formatFunnelPercent,
  getActivityFunnelStages,
  getFunnelMetrics,
  getFunnelProfile,
} from './activityFunnel';
export { Stat, type StatTone, type StatBreakdown, type StatBreakdownRow } from './Stat';
export { getOverviewMetrics } from './overview';
export * from './protectionSimulation';

export function ActivityFunnel({
  stages,
  filtered,
  total,
  rangeLabel,
}: {
  stages: ActivityFunnelStage[];
  filtered: number;
  total: number;
  rangeLabel: string;
}) {
  const headingId = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const active = dismissed ? null : (hovered ?? focused);
  const metrics = getFunnelMetrics(stages);
  const profile = getFunnelProfile(metrics.map((stage) => stage.share));
  const empty = !stages[0]?.value;
  const scopeLabel =
    filtered === total
      ? `${total.toLocaleString()} visitors`
      : `${filtered.toLocaleString()} of ${total.toLocaleString()} visitors`;

  return (
    <section className={styles.activityFunnel} aria-labelledby={headingId}>
      <header className={styles.activityFunnelHeader}>
        <div>
          <span>Activity funnel</span>
          <h2 id={headingId}>Traffic evaluation</h2>
        </div>
        <p>
          {scopeLabel} · {rangeLabel}
        </p>
      </header>
      <div className={styles.activityFunnelGraph}>
        <div className={styles.activityFunnelScale} aria-hidden="true">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <svg
          className={styles.activityFunnelPlot}
          viewBox="0 0 1000 72"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[0, 36].map((y) => (
            <line
              className={styles.activityFunnelGuide}
              x1="0"
              x2="1000"
              y1={y}
              y2={y}
              key={y}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {!empty && (
            <>
              <path className={styles.activityFunnelArea} d={profile.area} />
              <path
                className={styles.activityFunnelProfile}
                d={profile.line}
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
          <path
            className={styles.activityFunnelAxis}
            d="M0,72 H1000 M994,68 L1000,72 L994,76"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ol
          className={styles.activityFunnelTrack}
          style={{ gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(0, 1fr))` }}
        >
          {metrics.map((stage, index) => {
            const tooltipId = `${headingId}-${stage.id}`;
            const continuation =
              stage.continuation === null
                ? 'No previous-stage rate available.'
                : `${formatFunnelPercent(stage.continuation)} of ${stages[index - 1].label.toLowerCase()} visitors continue here.`;
            return (
              <li
                className={styles.activityFunnelStage}
                data-tone={stage.tone ?? 'default'}
                key={stage.id}
                onMouseEnter={() => {
                  setHovered(stage.id);
                  setDismissed(false);
                }}
                onMouseLeave={() => setHovered(null)}
              >
                <button
                  type="button"
                  className={styles.activityFunnelStageButton}
                  aria-label={
                    `${stage.label}: ${stage.value.toLocaleString()} visitors, ` +
                    (stage.share === null
                      ? 'no evaluated visitors'
                      : `${formatFunnelPercent(stage.share)} of evaluated`) +
                    '. Show stage details.'
                  }
                  aria-describedby={active === stage.id ? tooltipId : undefined}
                  onFocus={() => {
                    setFocused(stage.id);
                    setDismissed(false);
                  }}
                  onBlur={() => setFocused(null)}
                  onClick={() => setDismissed(false)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.stopPropagation();
                      setDismissed(true);
                    }
                  }}
                >
                  <span
                    className={styles.activityFunnelValue}
                    style={{ top: `${4.5 * (1 - Math.max(0, Math.min(1, stage.share ?? 0)))}rem` }}
                  >
                    <strong>{stage.value.toLocaleString()}</strong>
                    <small>{formatFunnelPercent(stage.share)}</small>
                  </span>
                  <span className={styles.activityFunnelStep}>
                    <i aria-hidden="true">{index + 1}</i>
                    {stage.label}
                  </span>
                </button>
                {active === stage.id && (
                  <div id={tooltipId} className={styles.activityFunnelTooltip} role="tooltip">
                    <strong>
                      {stage.label} · {stage.value.toLocaleString()} visitors
                    </strong>
                    <span>
                      {stage.share === null
                        ? 'No visitors in this cohort.'
                        : `${formatFunnelPercent(stage.share)} of evaluated visitors.`}{' '}
                      {index > 0 && continuation}
                    </span>
                    <span>{stage.detail}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <footer className={styles.activityFunnelFooter}>
        <span>
          {empty ? 'No visitors match the current filters' : 'Share of evaluated visitors · current status'}
        </span>
        <span>Evaluation stages →</span>
      </footer>
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {scopeLabel}. {rangeLabel}. {stages.map((stage) => `${stage.label}: ${stage.value}`).join('. ')}.
      </p>
    </section>
  );
}

export function KeyValue({
  label,
  value,
  mono = false,
  tone = 'default',
}: {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  tone?: 'default' | 'danger' | 'success';
}) {
  return (
    <div className={styles.keyValue}>
      <dt>{label}</dt>
      <dd className={`${mono ? styles.mono : ''} ${styles[`kv-${tone}`]}`}>{value ?? '—'}</dd>
    </div>
  );
}

export function FilterChip({
  label,
  value,
  active = false,
  onRemove,
  onClick,
}: {
  label: string;
  value?: string;
  active?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  return (
    <span className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}>
      <button type="button" onClick={onClick} aria-pressed={active}>
        {label}
        {value && <strong>{value}</strong>}
      </button>
      {onRemove && (
        <button type="button" aria-label={`Remove ${label} filter`} onClick={onRemove}>
          ×
        </button>
      )}
    </span>
  );
}

export function EmptyState({
  variant,
  title,
  body,
  action,
}: {
  variant: 'no-data' | 'no-results' | 'error' | 'all-clean';
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  const Icon =
    variant === 'error'
      ? AlertCircle
      : variant === 'no-results'
        ? SearchX
        : variant === 'all-clean'
          ? Radar
          : Inbox;
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>
        <Icon aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

export function DataTable({
  children,
  label = 'Threat monitoring results',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className={styles.tableScroller}>
      <table className={styles.dataTable} aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function BatchBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.batchBar}>
      <strong>{count} selected</strong>
      {children}
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear selection
      </Button>
    </div>
  );
}

export function LoadingRows({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.loadingRows} aria-label="Loading visitors">
      {Array.from({ length: count }, (_, index) => (
        <div className={styles.skeletonRow} key={index}>
          <i />
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}
