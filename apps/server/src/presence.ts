export type PresenceEntry = {
  sessionId: string;
  characterId: string;
  name: string;
  x: number;
  z: number;
  zone: string;
  /** Whether `zone` is a private room (its own voice channel). */
  privateRoom: boolean;
  voiceKey: string;
};

/** VOICE_ROOM lets parallel test servers share one LiveKit without hearing each other. */
export const floorRoom = process.env.VOICE_ROOM ?? "office:workbits-loft";
export const meetingRoom = `${floorRoom}:meeting`;

/**
 * LiveKit room for an authoritative zone. Private rooms (ADR-015) get their
 * own; every other zone shares the floor room so proximity audio still works
 * through the open office.
 */
export function voiceRoomFor(zone: string, privateRoom: boolean) {
  return privateRoom ? `${floorRoom}:${zone}` : floorRoom;
}

export const presence = new Map<string, PresenceEntry>();
