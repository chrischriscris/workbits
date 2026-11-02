export const NEAR_DISTANCE = 1.2;
export const FAR_DISTANCE = 7.5;

export function proximityGain(distance: number) {
  const raw = 1 - (distance - NEAR_DISTANCE) / (FAR_DISTANCE - NEAR_DISTANCE);
  return Math.max(0, Math.min(1, raw));
}

/**
 * Demo-only meeting-room isolation. This gates audio by zone on the client.
 * The production path is one LiveKit room per private room, so outsiders never
 * receive the audio track at all.
 */
export function inMeetingRoom(x: number, z: number) {
  return x > 3.4 && x < 10.8 && z > -8.0 && z < -1.2;
}

