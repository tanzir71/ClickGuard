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

export function Stat({
  label,
  value,
  caption,
  tone = 'default',
  icon,
  breakdown,
  actionLabel,
  onClick,
  animate = false,
  change,
  emphasized = false,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: StatTone;
  icon?: ReactNode;
  breakdown?: StatBreakdown;
  actionLabel?: string;
  onClick?: () => void;
  animate?: boolean;
  change?: string;
  emphasized?: boolean;
}) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = Boolean(breakdown) && (hovered || focused) && !dismissed;
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setDismissed(true);
      }
    };
    document.addEventListener('keydown', dismiss, true);
    return () => document.removeEventListener('keydown', dismiss, true);
  }, [open]);
  const total = breakdown?.rows.reduce((sum, row) => sum + Math.max(0, row.value), 0) ?? 0;
  const classes = `${styles.stat} ${styles[`stat-${tone}`]}`;
  const content = (
    <>
      <span className={styles.statHeader}>
        <span className={styles.statLabel}>{label}</span>
        {icon && (
          <span className={styles.statIcon} aria-hidden="true">
            {icon}
          </span>
        )}
      </span>
      <span className={styles.statValueLine}>
        <strong className={styles.statValue}>{animate ? <RollingValue value={value} /> : value}</strong>
        {change && (
          <span key={value} className={styles.statChange} aria-hidden="true">
            {change}
          </span>
        )}
      </span>
      <span className={styles.statCaption}>
        {caption}
        {breakdown && <Info aria-hidden="true" />}
      </span>
      {breakdown && (
        <span className={styles.statComposition} aria-hidden="true">
          {breakdown.rows
            .filter((row) => row.value > 0)
            .map((row) => (
              <i
                key={row.label}
                data-tone={row.tone ?? tone}
                style={{ width: `${total > 0 ? (row.value / total) * 100 : 0}%` }}
              />
            ))}
        </span>
      )}
    </>
  );

  return (
    <div
      className={styles.statShell}
      data-open={open}
      onMouseEnter={() => {
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {onClick || breakdown ? (
        <button
          type="button"
          className={classes}
          data-emphasized={emphasized || undefined}
          aria-label={`${label}: ${value}${actionLabel ? `. ${actionLabel}` : breakdown ? '. Show breakdown' : ''}`}
          aria-describedby={open ? tooltipId : undefined}
          onPointerDown={() => setFocused(false)}
          onFocus={(event) => {
            setFocused(event.currentTarget.matches(':focus-visible'));
            setDismissed(false);
          }}
          onBlur={() => setFocused(false)}
          onClick={() => {
            setDismissed(false);
            onClick?.();
          }}
        >
          {content}
        </button>
      ) : (
        <div className={classes} data-emphasized={emphasized || undefined}>
          {content}
        </div>
      )}
      {open && breakdown && (
        <div className={styles.statPopoverAnchor}>
          <div id={tooltipId} className={styles.statPopover} role="tooltip">
            <header>
              <span>{breakdown.title}</span>
              <strong>{value}</strong>
            </header>
            <dl>
              {breakdown.rows.map((row) => (
                <div key={row.label}>
                  <dt>
                    <i data-tone={row.tone ?? tone} />
                    {row.label}
                  </dt>
                  <dd>
                    <strong>{row.displayValue ?? row.value.toLocaleString()}</strong>
                    <small>
                      {total > 0
                        ? `${((row.value / total) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
                        : '—'}
                    </small>
                  </dd>
                </div>
              ))}
            </dl>
            {breakdown.note && <p>{breakdown.note}</p>}
            {(breakdown.scope || actionLabel) && (
              <footer>
                {breakdown.scope && <span>{breakdown.scope}</span>}
                {actionLabel && <strong>{actionLabel} →</strong>}
              </footer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Animate only changed characters; updates never re-render the traffic table. */
function RollingValue({ value }: { value: string }) {
  const [snapshot, setSnapshot] = useState({ current: value, previous: value });
  if (snapshot.current !== value) setSnapshot({ current: value, previous: snapshot.current });
  const previous = snapshot.previous.padStart(value.length, ' ').slice(-value.length);
  return (
    <>
      <span className={styles.srOnly}>{value}</span>
      <span className={styles.rollingValue} aria-hidden="true">
        {[...value].map((character, index) => {
          const old = previous[index];
          const changed = character !== old && /\d/.test(character);
          return (
            <span className={styles.rollingCharacter} key={value.length - index}>
              {changed ? (
                <span className={styles.rollingPair} key={`${old}-${character}`}>
                  <span className={styles.rollingOld}>{old}</span>
                  <span className={styles.rollingNew}>{character}</span>
                </span>
              ) : (
                character
              )}
            </span>
          );
        })}
      </span>
    </>
  );
}
