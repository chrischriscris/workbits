export type PresenceEntry = {
  sessionId: string;
  characterId: string;
  name: string;
  x: number;
  z: number;
  zone: string;
  voiceKey: string;
};

export const floorRoom = "office:workbits-loft";
export const meetingRoom = "office:workbits-loft:meeting";

/**
 * LiveKit room for an authoritative zone. Only the meeting room is isolated
 * today; every other zone shares the floor room so proximity audio still works
 * through the open office.
 */
export function voiceRoomFor(zone: string) {
  return zone === "meeting" ? meetingRoom : floorRoom;
}

export const presence = new Map<string, PresenceEntry>();
