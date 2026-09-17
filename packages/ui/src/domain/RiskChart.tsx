import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { VisitVM } from '../model';
import styles from '../styles/ClickGuard.module.css';

interface RiskChartProps {
  visits: VisitVM[];
  threshold: number;
  blockedAtVisitId?: string;
  selectedVisitId?: string;
  size?: 'panel' | 'wide';
  onSelectVisit?: (id: string) => void;
}

const dateLabel = (at: string) => new Date(at).toLocaleDateString([], { month: 'short', day: 'numeric' });
const timeLabel = (at: string) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const platformNames = { google_ads: 'Google Ads', meta_ads: 'Meta Ads', microsoft_ads: 'Microsoft Ads' };

function ChartKey({ kind, label }: { kind: 'paid' | 'unpaid' | 'decision' | 'after'; label: string }) {
  return <span><svg viewBox="0 0 16 16" aria-hidden="true">
    {kind === 'decision' ? <path className={styles.chartDecision} d="M 8 2 L 14 8 L 8 14 L 2 8 Z" />
      : kind === 'after' ? <path className={styles.chartAfterLine} d="M 1 8 H 15" />
        : <circle className={kind === 'paid' ? styles.chartPaid : styles.chartUnpaid} cx="8" cy="8" r="4" />}
  </svg>{label}</span>;
}

export function RiskChart({ visits, threshold, blockedAtVisitId, selectedVisitId, size = 'panel', onSelectVisit }: RiskChartProps) {
  const [localSelectedId, setLocalSelectedId] = useState<string>();
  const [hoveredId, setHoveredId] = useState<string>();
  const [focusedId, setFocusedId] = useState<string>();
  const markerRefs = useRef(new Map<string, SVGGElement>());
  const descriptionId = useId();
  const ordered = [...visits].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  if (!ordered.length) return <div className={styles.chartEmpty}>No visits in this range</div>;

  const width = size === 'wide' ? 760 : 380;
  const height = size === 'wide' ? 220 : 176;
  const left = 32; const right = width - 12; const top = 12; const bottom = height - 40;
  const first = ordered[0]; const last = ordered[ordered.length - 1];
  const start = Date.parse(first.startedAt); const span = Date.parse(last.startedAt) - start;
  const scoreY = (score: number) => bottom - Math.max(0, Math.min(100, score)) / 100 * (bottom - top);
  const points = ordered.map((visit, index) => ({ visit, index,
    x: span > 0 ? left + (Date.parse(visit.startedAt) - start) / span * (right - left) : (left + right) / 2,
    y: scoreY(visit.scoreAfter),
  }));
  const decisionIndex = points.findIndex(({ visit }) => visit.id === blockedAtVisitId);
  const decision = points[decisionIndex];
  const selected = points.find(({ visit }) => visit.id === (selectedVisitId ?? localSelectedId)) ?? decision ?? points[points.length - 1];
  const inspected = points.find(({ visit }) => visit.id === (hoveredId ?? focusedId)) ?? selected;
  const path = (startIndex: number, endIndex: number, continuation = false) => points.slice(startIndex, endIndex).map((point, index) => index === 0
    ? `M ${point.x} ${continuation ? point.y : scoreY(point.visit.scoreBefore)}${continuation ? '' : ` V ${point.y}`}`
    : `H ${point.x} V ${scoreY(point.visit.scoreBefore)} V ${point.y}`).join(' ');
  const beforePath = path(0, decisionIndex >= 0 ? decisionIndex + 1 : points.length);
  const afterPath = decisionIndex >= 0 && decisionIndex < points.length - 1 ? path(decisionIndex, points.length, true) : '';
  const thresholdY = scoreY(threshold);
  const ticks = [0, 40, 100].filter((score) => Math.abs(scoreY(score) - thresholdY) > 14);
  const choose = (id: string) => { setLocalSelectedId(id); onSelectVisit?.(id); };
  const handleKey = (event: KeyboardEvent<SVGGElement>, index: number) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1
        : Math.max(0, Math.min(points.length - 1, index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1)));
      markerRefs.current.get(points[next].visit.id)?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); event.stopPropagation(); choose(points[index].visit.id);
    }
  };
  // Thin only the visual markers, never the data or keyboard-selectable visits.
  let previousMarker = { x: -Infinity, y: -Infinity };
  const visibleIds = new Set(points.filter((point, index) => {
    if (index === 0 || index === points.length - 1 || point === decision || Math.hypot(point.x - previousMarker.x, point.y - previousMarker.y) >= 10) {
      previousMarker = point; return true;
    }
    return false;
  }).map(({ visit }) => visit.id));
  const current = inspected.visit;

  return <div className={`${styles.riskChart} ${styles[`chart-${size}`]}`}>
    <div className={styles.chartHeading}><span>Risk score</span><span className={styles.chartThresholdKey}>Block threshold · {threshold}</span></div>
    <svg className={styles.chartPlot} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Risk journey. Block threshold ${threshold}.`} aria-describedby={descriptionId} onMouseLeave={() => setHoveredId(undefined)}>
      <desc id={descriptionId}>Risk score from 0 to 100 over time. Arrow keys move between visits; Enter or Space selects a visit. Diamond marks the block decision, not its delivery status.</desc>
      <rect className={styles.chartRiskZone} x={left} y={top} width={right - left} height={thresholdY - top} />
      {ticks.map((score) => <g key={score} aria-hidden="true">
        <line className={styles.chartGrid} x1={left} x2={right} y1={scoreY(score)} y2={scoreY(score)} />
        <text className={styles.chartAxisLabel} x={left - 8} y={scoreY(score)} textAnchor="end" dominantBaseline="middle">{score}</text>
      </g>)}
      <line className={styles.chartThreshold} x1={left} x2={right} y1={thresholdY} y2={thresholdY} />
      <text className={styles.chartThresholdLabel} x={left - 8} y={thresholdY} textAnchor="end" dominantBaseline="middle">{threshold}</text>
      <path className={styles.chartLine} d={beforePath} />
      {afterPath && <path className={styles.chartAfterLine} d={afterPath} />}
      {decision && <line className={styles.chartBlock} x1={decision.x} x2={decision.x} y1={decision.y + 7} y2={bottom} />}
      <line className={styles.chartCrosshair} x1={inspected.x} x2={inspected.x} y1={top} y2={bottom} />
      {points.map((point) => {
        const isSelected = point === selected;
        const shown = visibleIds.has(point.visit.id) || point === inspected || isSelected;
        return <g key={point.visit.id} ref={(element) => { if (element) markerRefs.current.set(point.visit.id, element); else markerRefs.current.delete(point.visit.id); }}
          className={`${styles.chartPoint} ${isSelected ? styles.chartSelected : ''}`} role="button" tabIndex={point.visit.id === (focusedId ?? selected.visit.id) ? 0 : -1}
          aria-label={`Visit ${point.index + 1}, score ${point.visit.scoreAfter}`} aria-pressed={isSelected}
          onMouseEnter={() => setHoveredId(point.visit.id)} onFocus={() => setFocusedId(point.visit.id)} onBlur={() => setFocusedId(undefined)}
          onClick={() => choose(point.visit.id)} onKeyDown={(event) => handleKey(event, point.index)}>
          <circle className={styles.chartHitArea} cx={point.x} cy={point.y} r="9" />
          {shown && (point === decision
            ? <path className={styles.chartDecision} d={`M ${point.x} ${point.y - 5} L ${point.x + 5} ${point.y} L ${point.x} ${point.y + 5} L ${point.x - 5} ${point.y} Z`} />
            : <circle className={point.visit.source === 'paid' ? styles.chartPaid : styles.chartUnpaid} cx={point.x} cy={point.y} r="4" />)}
          <circle className={styles.chartSelectionRing} cx={point.x} cy={point.y} r="8" />
        </g>;
      })}
      <g aria-hidden="true" className={styles.chartAxisLabel}>
        <text x={left} y={bottom + 18}>{dateLabel(first.startedAt)}</text>
        <text x={left} y={bottom + 33}>{timeLabel(first.startedAt)}</text>
        <text x={(left + right) / 2} y={bottom + 26} textAnchor="middle">{points.length === 1 ? '1 visit' : 'Time →'}</text>
        {points.length > 1 && <><text x={right} y={bottom + 18} textAnchor="end">{dateLabel(last.startedAt)}</text><text x={right} y={bottom + 33} textAnchor="end">{timeLabel(last.startedAt)}</text></>}
      </g>
    </svg>
    <div className={styles.chartLegend}>
      <ChartKey kind="paid" label="Paid" /><ChartKey kind="unpaid" label="Unpaid" />
      {decision && <ChartKey kind="decision" label="Decision" />}{afterPath && <ChartKey kind="after" label="After decision" />}
    </div>
    <div className={styles.chartReadout}>
      <div><strong>Visit {inspected.index + 1} <span>· {timeLabel(current.startedAt)}</span></strong><b>{current.scoreBefore} <span>→</span> {current.scoreAfter}</b></div>
      <div><span>{current.source === 'paid' ? `Paid${current.platform ? ` · ${platformNames[current.platform]}` : ''}` : current.source[0].toUpperCase() + current.source.slice(1)} · {dateLabel(current.startedAt)}</span>
        <span className={inspected === decision ? styles.chartDecisionText : ''}>{inspected === decision ? 'Block decision' : decision && inspected.index > decisionIndex ? 'After decision' : points.length === 1 ? 'Only visit so far' : `${ordered.length} visits total`}</span></div>
    </div>
  </div>;
}
