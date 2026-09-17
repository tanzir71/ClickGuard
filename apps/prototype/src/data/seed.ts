export function mulberry32(seed: number) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: () => number, values: readonly T[]): T { return values[Math.floor(random() * values.length)]!; }
export function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
