import type { VisitVM } from '../model';
import { riskStepPath } from './riskStepPath';

export const JOURNEY_PLOT = { width: 200, height: 48, left: 8, right: 174, top: 5, bottom: 37 };

function elapsedLabel(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 1) return milliseconds === 0 ? 'Same time' : '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
  return `${Math.floor(hours / 24)}d${hours % 24 ? ` ${hours % 24}h` : ''}`;
}

export function buildVisitJourney(visits: VisitVM[], threshold = 70, blockedAtVisitId?: string) {
  const ordered = [...visits].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const first = Date.parse(ordered[0]?.startedAt ?? '');
  const last = Date.parse(ordered.at(-1)?.startedAt ?? '');
  const span = ordered.length ? last - first : 0;
  const { left, right, top, bottom } = JOURNEY_PLOT;
  const y = (score: number) => Number((bottom - Math.max(0, Math.min(100, score)) / 100 * (bottom - top)).toFixed(2));
  const points = ordered.map((visit, index) => ({
    visit, index,
    x: Number((span > 0 ? left + (Date.parse(visit.startedAt) - first) / span * (right - left) : (left + right) / 2).toFixed(2)),
    y: y(visit.scoreAfter), beforeY: y(visit.scoreBefore),
    kind: visit.id === blockedAtVisitId ? 'decision' : visit.conversion ? 'conversion' : visit.source === 'paid' ? 'paid' : 'unpaid',
  }));
  const triggerIndex = points.findIndex((point) => point.visit.id === blockedAtVisitId);
  const path = (start: number, end: number, continuation = false) => riskStepPath(points.slice(start, end), continuation);
  // Keep the exact score path, but reduce overlapping markers in dense histories.
  // Every visit remains reachable with the arrow keys, including coincident timestamps.
  let previousX = -Infinity;
  const markers = points.filter((point, index) => {
    if (index === 0 || index === points.length - 1 || point.kind === 'decision' || point.kind === 'conversion' || point.x - previousX >= 9) {
      previousX = point.x; return true;
    }
    return false;
  });
  return {
    points, markers, triggerIndex, thresholdY: y(threshold),
    beforePath: path(0, triggerIndex >= 0 ? triggerIndex + 1 : points.length),
    afterPath: triggerIndex >= 0 && triggerIndex < points.length - 1 ? path(triggerIndex, points.length, true) : '',
    elapsed: ordered.length === 1 ? '1 visit' : elapsedLabel(span),
    paid: ordered.filter((visit) => visit.source === 'paid').length,
  };
}
