import { useEffect, useId, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import styles from '../styles/ClickGuard.module.css';

export type StatTone = 'default' | 'danger' | 'warning' | 'success' | 'muted';

export interface StatBreakdownRow {
  label: string;
  value: number;
  displayValue?: string;
  tone?: StatTone;
}

export interface StatBreakdown {
  title: string;
  rows: StatBreakdownRow[];
  note?: string;
  scope?: string;
}

export function Stat({ label, value, caption, tone = 'default', icon, breakdown, actionLabel, onClick }: {
  label: string; value: string; caption?: string; tone?: StatTone; icon?: ReactNode;
  breakdown?: StatBreakdown; actionLabel?: string; onClick?: () => void;
}) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = Boolean(breakdown) && (hovered || focused) && !dismissed;
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setDismissed(true); }
    };
    document.addEventListener('keydown', dismiss, true);
    return () => document.removeEventListener('keydown', dismiss, true);
  }, [open]);
  const total = breakdown?.rows.reduce((sum, row) => sum + Math.max(0, row.value), 0) ?? 0;
  const classes = `${styles.stat} ${styles[`stat-${tone}`]}`;
  const content = <>
    <span className={styles.statHeader}><span className={styles.statLabel}>{label}</span>{icon && <span className={styles.statIcon} aria-hidden="true">{icon}</span>}</span>
    <strong className={styles.statValue}>{value}</strong>
    <span className={styles.statCaption}>{caption}{breakdown && <Info aria-hidden="true" />}</span>
    {breakdown && <span className={styles.statComposition} aria-hidden="true">{breakdown.rows.filter((row) => row.value > 0).map((row) => <i key={row.label} data-tone={row.tone ?? tone} style={{ width: `${total > 0 ? row.value / total * 100 : 0}%` }} />)}</span>}
  </>;

  return <div className={styles.statShell} data-open={open} onMouseEnter={() => { setHovered(true); setDismissed(false); }} onMouseLeave={() => setHovered(false)}>
    {onClick || breakdown ? <button type="button" className={classes} aria-label={`${label}: ${value}${actionLabel ? `. ${actionLabel}` : breakdown ? '. Show breakdown' : ''}`} aria-describedby={open ? tooltipId : undefined} onPointerDown={() => setFocused(false)} onFocus={(event) => { setFocused(event.currentTarget.matches(':focus-visible')); setDismissed(false); }} onBlur={() => setFocused(false)} onClick={() => { setDismissed(false); onClick?.(); }}>{content}</button> : <div className={classes}>{content}</div>}
    {open && breakdown && <div className={styles.statPopoverAnchor}><div id={tooltipId} className={styles.statPopover} role="tooltip">
      <header><span>{breakdown.title}</span><strong>{value}</strong></header>
      <dl>{breakdown.rows.map((row) => <div key={row.label}><dt><i data-tone={row.tone ?? tone} />{row.label}</dt><dd><strong>{row.displayValue ?? row.value.toLocaleString()}</strong><small>{total > 0 ? `${(row.value / total * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : '—'}</small></dd></div>)}</dl>
      {breakdown.note && <p>{breakdown.note}</p>}
      {(breakdown.scope || actionLabel) && <footer>{breakdown.scope && <span>{breakdown.scope}</span>}{actionLabel && <strong>{actionLabel} →</strong>}</footer>}
    </div></div>}
  </div>;
}
