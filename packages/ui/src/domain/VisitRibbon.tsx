import { useId, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { VisitVM, VisitorStatus } from '../model';
import { buildVisitJourney, JOURNEY_PLOT } from './visitJourney';
import styles from '../styles/ClickGuard.module.css';

export function VisitRibbon({ visits, threshold = 70, blockedAtVisitId, status, onDotClick }: {
  visits: VisitVM[]; threshold?: number; blockedAtVisitId?: string; status?: VisitorStatus; onDotClick?: (id: string) => void;
}) {
  const detailId = useId();
  const chart = useMemo(() => buildVisitJourney(visits, threshold, blockedAtVisitId), [visits, threshold, blockedAtVisitId]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [exploring, setExploring] = useState(false);
  if (!chart.points.length) return <span className={styles.muted}>No visits</span>;
  const first = chart.points[0].visit;
  const last = chart.points.at(-1)!.visit;
  const active = chart.points[Math.min(activeIndex ?? (chart.triggerIndex >= 0 ? chart.triggerIndex : chart.points.length - 1), chart.points.length - 1)];
  const trigger = chart.points[chart.triggerIndex];
  const conversion = chart.points.find((point) => point.visit.conversion);
  const summary = trigger ? `${status === 'allowed' ? 'Prior decision' : 'Decision'} #${chart.triggerIndex + 1}`
    : conversion ? `Converted #${conversion.index + 1}` : `Risk ${first.scoreBefore} → ${last.scoreAfter}`;
  const activeLabel = `Visit ${active.index + 1} · ${active.visit.source}${active.kind === 'decision' ? ' · block decision' : ''}${active.visit.conversion ? ' · converted' : ''}${active.visit.afterBlock ? ' · after decision' : ''}`;
  const detail = `${activeLabel}. ${new Date(active.visit.startedAt).toLocaleString()}. Risk ${active.visit.scoreBefore} → ${active.visit.scoreAfter}.`;
  const selectNearest = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    const x = (event.clientX - bounds.left) / bounds.width * JOURNEY_PLOT.width;
    const nearest = chart.points.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best);
    setActiveIndex(nearest.index); setExploring(true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') { setExploring(false); event.stopPropagation(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); setExploring(true);
    setActiveIndex(event.key === 'Home' ? 0 : event.key === 'End' ? chart.points.length - 1 : Math.max(0, Math.min(chart.points.length - 1, active.index + (event.key === 'ArrowRight' ? 1 : -1))));
  };

  return <button type="button" className={styles.ribbon} aria-label={`${visits.length} visit journey. ${summary}. Risk ${first.scoreBefore} to ${last.scoreAfter}. ${chart.elapsed}. Use left and right arrows to explore; Enter to open visit.`} aria-describedby={detailId}
    onMouseEnter={() => setExploring(true)} onMouseLeave={() => setExploring(false)} onFocus={() => setExploring(true)} onBlur={() => setExploring(false)} onKeyDown={onKeyDown}
    onClick={(event) => { event.stopPropagation(); onDotClick?.(active.visit.id); }} title={detail}>
    <span className={styles.ribbonHeading}><span>{summary}</span><span>{chart.elapsed}</span></span>
    <svg viewBox={`0 0 ${JOURNEY_PLOT.width} ${JOURNEY_PLOT.height}`} aria-hidden="true" onMouseMove={selectNearest}>
      {trigger && chart.afterPath && <rect className={styles.ribbonAfterArea} x={trigger.x} y={JOURNEY_PLOT.top} width={JOURNEY_PLOT.right - trigger.x} height={JOURNEY_PLOT.bottom - JOURNEY_PLOT.top} />}
      <line className={styles.ribbonThreshold} x1={JOURNEY_PLOT.left} x2={JOURNEY_PLOT.right} y1={chart.thresholdY} y2={chart.thresholdY} />
      <text className={styles.ribbonScale} x="182" y={chart.thresholdY + 3}>{threshold}</text>
      <path className={styles.ribbonAxis} d="M 8 44 H 176 M 172 41 L 176 44 L 172 47" />
      <path className={styles.ribbonRisk} d={chart.beforePath} />
      {chart.afterPath && <path className={`${styles.ribbonRisk} ${styles.ribbonAfter}`} d={chart.afterPath} />}
      {trigger && <line className={styles.ribbonDecisionLine} x1={trigger.x} x2={trigger.x} y1="2" y2="39" />}
      {chart.markers.map((point) => <g key={point.visit.id} className={styles.ribbonMarker} data-kind={point.kind} data-after={point.visit.afterBlock}>
        {point.kind === 'decision' ? <path d={`M ${point.x} ${point.y - 5} l 5 5 -5 5 -5 -5 Z`} />
          : point.kind === 'conversion' ? <rect x={point.x - 3.5} y={point.y - 3.5} width="7" height="7" />
            : <circle cx={point.x} cy={point.y} r="2.8" />}
      </g>)}
      {exploring && <circle className={styles.ribbonActive} cx={active.x} cy={active.y} r="6.5" />}
    </svg>
    <span className={styles.ribbonCaption}>{exploring ? `#${active.index + 1} ${active.visit.source} · ${active.visit.scoreBefore} → ${active.visit.scoreAfter}${active.kind === 'decision' ? ' ◆' : active.visit.conversion ? ' ▪' : ''}` : `${visits.length} ${visits.length === 1 ? 'visit' : 'visits'} · ${chart.paid} paid`}</span>
    <span id={detailId} className={styles.srOnly} aria-live="polite">{exploring ? `${detail} Left/right: previous/next visit. Enter: open details.` : 'Risk uses a fixed 0–100 scale. Horizontal position is elapsed time from first to last recorded visit. Filled circle: paid. Hollow circle: unpaid. Diamond: block decision, not confirmation of platform exclusion. Square: conversion.'}</span>
  </button>;
}
