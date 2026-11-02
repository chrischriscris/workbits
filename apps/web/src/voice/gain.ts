export const NEAR_DISTANCE = 1.2;
export const FAR_DISTANCE = 7.5;

export function proximityGain(distance: number) {
  const raw = 1 - (distance - NEAR_DISTANCE) / (FAR_DISTANCE - NEAR_DISTANCE);
  return Math.max(0, Math.min(1, raw));
}
