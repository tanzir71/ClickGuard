import type { ReactNode } from 'react';
import { AlertCircle, Inbox, Radar, SearchX } from 'lucide-react';
import styles from '../styles/ClickGuard.module.css';
import { Button } from '../primitives';

export function Stat({ label, value, caption, tone = 'default', onClick }: { label: string; value: string; caption?: string; tone?: 'default' | 'danger' | 'warning' | 'success'; onClick?: () => void }) {
  const content = <><span className={styles.statLabel}>{label}</span><strong className={styles.statValue}>{value}</strong>{caption && <span className={styles.statCaption}>{caption}</span>}</>;
  return onClick ? <button type="button" className={`${styles.stat} ${styles[`stat-${tone}`]}`} onClick={onClick}>{content}</button> : <div className={`${styles.stat} ${styles[`stat-${tone}`]}`}>{content}</div>;
}

export function KeyValue({ label, value, mono = false, tone = 'default' }: { label: string; value?: ReactNode; mono?: boolean; tone?: 'default' | 'danger' | 'success' }) {
  return <div className={styles.keyValue}><dt>{label}</dt><dd className={`${mono ? styles.mono : ''} ${styles[`kv-${tone}`]}`}>{value ?? '—'}</dd></div>;
}

export function FilterChip({ label, value, active = false, onRemove, onClick }: { label: string; value?: string; active?: boolean; onRemove?: () => void; onClick?: () => void }) {
  return <span className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}><button type="button" onClick={onClick} aria-pressed={active}>{label}{value && <strong>{value}</strong>}</button>{onRemove && <button type="button" aria-label={`Remove ${label} filter`} onClick={onRemove}>×</button>}</span>;
}

export function EmptyState({ variant, title, body, action }: { variant: 'no-data' | 'no-results' | 'error' | 'all-clean'; title: string; body: string; action?: { label: string; onClick: () => void } }) {
  const Icon = variant === 'error' ? AlertCircle : variant === 'no-results' ? SearchX : variant === 'all-clean' ? Radar : Inbox;
  return <div className={styles.emptyState}><span className={styles.emptyIcon}><Icon aria-hidden="true" /></span><h3>{title}</h3><p>{body}</p>{action && <Button onClick={action.onClick}>{action.label}</Button>}</div>;
}

export function DataTable({ children, label = 'Threat monitoring results' }: { children: ReactNode; label?: string }) {
  return <div className={styles.tableScroller}><table className={styles.dataTable} aria-label={label}>{children}</table></div>;
}

export function BatchBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  return <div className={styles.batchBar}><strong>{count} selected</strong>{children}<Button variant="ghost" size="sm" onClick={onClear}>Clear selection</Button></div>;
}

export function LoadingRows({ count = 8 }: { count?: number }) {
  return <div className={styles.loadingRows} aria-label="Loading visitors">{Array.from({ length: count }, (_, index) => <div className={styles.skeletonRow} key={index}><i /><i /><i /><i /></div>)}</div>;
}
