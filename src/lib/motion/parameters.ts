/** All three effects share these deliberately modest limits. Values are CSS pixels / ms. */
export interface ProjectMotionOptions {
  maxTranslation?: number;
  followMs?: number;
  returnMs?: number;
}

export const motionParameters = Object.freeze({
  canvasDpr: 1.5,
  carrierScale: 1.025,
  homeTravel: 9,
  detailTravel: 5,
  followResponseMs: 115,
  focusResponseMs: 65,
  focusRadiusRatio: 0.52,
  titleResponseMs: 55,
  returnResponseMs: 135,
  enterDuration: 0.22,
  leaveDuration: 0.46,
  settleDistance: 0.025,
  trailLifetimeMs: 800,
  trailMaxPoints: 90,
  trailMinDistance: 2,
  trailOpacity: 0.13,
  trailSoftness: 10,
});

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** A time-based response, so the feel does not depend on the display refresh rate. */
export function approach(current: number, target: number, delta: number, responseMs: number): number {
  const next = current + (target - current) * (1 - Math.exp(-delta / responseMs));
  return Math.abs(next - target) < motionParameters.settleDistance ? target : next;
}
