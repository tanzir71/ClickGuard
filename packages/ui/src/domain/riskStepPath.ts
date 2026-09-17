interface RiskStepPoint { x: number; y: number; beforeY: number }

/** Keep risers between visit markers, leaving dots on the horizontal steps.
 * Markers retain the recorded time/score; connectors do not imply interim samples.
 */
export function riskStepPath(points: RiskStepPoint[], continuation = false) {
  return points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${continuation ? point.y : point.beforeY}${continuation ? '' : ` V ${point.y}`}`;
    const cornerX = Number(((points[index - 1].x + point.x) / 2).toFixed(2));
    return `H ${cornerX} V ${point.beforeY} V ${point.y} H ${point.x}`;
  }).join(' ');
}
