interface RiskStepPoint { x: number; y: number; beforeY: number }

/** Finish each step's vertical edge at the recorded visit marker. */
export function riskStepPath(points: RiskStepPoint[], continuation = false) {
  return points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${continuation ? point.y : point.beforeY}${continuation ? '' : ` V ${point.y}`}`;
    return `H ${point.x} V ${point.beforeY} V ${point.y}`;
  }).join(' ');
}
