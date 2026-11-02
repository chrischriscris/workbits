import { create } from "zustand";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
} from "livekit-client";
import { apiBase } from "../config";
import { localCharacter } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { proximityGain } from "./gain";

type VoiceStatus = "idle" | "connecting" | "connected" | "error";
type VoiceChannel = "floor" | "meeting";

type VoiceState = {
  status: VoiceStatus;
  identity: string | null;
  channel: VoiceChannel | null;
  muted: boolean;
  deafened: boolean;
  audioBlocked: boolean;
  speaking: string[];
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => void;
  enableAudio: () => Promise<void>;
  syncZone: (zone: string) => Promise<void>;
};

let voiceRoom: Room | null = null;
let audioContainer: HTMLDivElement | null = null;
let proximityTimer: number | null = null;
let switching = false;
const lastVolumes: Record<string, number> = {};

function ensureAudioContainer() {
  if (audioContainer) return audioContainer;
  audioContainer = document.createElement("div");
  audioContainer.style.display = "none";
  audioContainer.setAttribute("aria-hidden", "true");
  document.body.appendChild(audioContainer);
  return audioContainer;
}

function stopVoice() {
  if (proximityTimer !== null) {
    window.clearInterval(proximityTimer);
    proximityTimer = null;
  }
  const room = voiceRoom;
  voiceRoom = null;
  room?.disconnect();
  audioContainer?.replaceChildren();
  for (const key of Object.keys(lastVolumes)) delete lastVolumes[key];
}

function updateProximity() {
  if (!voiceRoom) return;
  const { localPosition, players } = useRealtimeStore.getState();
  const deafened = useVoiceStore.getState().deafened;

  const present = new Set<string>();
  voiceRoom.remoteParticipants.forEach((participant) => present.add(participant.identity));
  for (const key of Object.keys(lastVolumes)) {
    if (!present.has(key)) delete lastVolumes[key];
  }

  voiceRoom.remoteParticipants.forEach((participant: RemoteParticipant) => {
    const player = players[participant.identity];
    if (!player) {
      participant.setVolume(deafened ? 0 : 0.35);
      lastVolumes[participant.identity] = deafened ? 0 : 0.35;
      return;
    }
    const distance = Math.hypot(player.x - localPosition.x, player.z - localPosition.z);
    const volume = deafened ? 0 : proximityGain(distance);
    participant.setVolume(volume);
    lastVolumes[participant.identity] = volume;
  });
}

async function joinVoice(
  set: (partial: Partial<VoiceState>) => void,
  publish: boolean,
) {
  const sessionId = useRealtimeStore.getState().sessionId;
  if (!sessionId) throw new Error("Join the office before voice.");

  const params = new URLSearchParams({
    identity: sessionId,
    name: localCharacter.displayName,
  });
  const response = await fetch(`${apiBase()}/livekit/token?${params.toString()}`);
  if (!response.ok) {
    if (response.status === 403) throw new Error("Still joining the office. Try again in a moment.");
    throw new Error(`Token request failed (${response.status})`);
  }
  const { token, url, room: roomName } = (await response.json()) as {
    token: string;
    url: string;
    room: string;
  };

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  voiceRoom = room;
  ensureAudioContainer();

  room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
    if (voiceRoom !== room) return;
    if (track.kind !== Track.Kind.Audio) return;
    const element = track.attach();
    element.autoplay = true;
    audioContainer?.appendChild(element);
  });
  room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio) return;
    track.detach();
  });
  room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
    if (voiceRoom !== room) return;
    set({ speaking: speakers.map((speaker) => speaker.identity) });
  });
  room.on(RoomEvent.Disconnected, () => {
    if (voiceRoom !== room) return;
    stopVoice();
    set({ status: "idle", channel: null, speaking: [] });
  });

  await room.connect(url, token);
  if (voiceRoom !== room) return;

  try {
    await room.startAudio();
    set({ audioBlocked: false });
  } catch {
    set({ audioBlocked: true });
  }

  set({
    status: "connected",
    identity: sessionId,
    channel: roomName.endsWith(":meeting") ? "meeting" : "floor",
    muted: !publish,
    error: null,
  });

  if (publish) {
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (error) {
      set({
        muted: true,
        error: error instanceof Error ? error.message : "Microphone permission denied",
      });
    }
  }

  updateProximity();
  proximityTimer = window.setInterval(updateProximity, 180);
  if (useVoiceStore.getState().deafened) updateProximity();
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  status: "idle",
  identity: null,
  channel: null,
  muted: true,
  deafened: false,
  audioBlocked: false,
  speaking: [],
  error: null,

  connect: async () => {
    if (get().status === "connecting" || get().status === "connected" || switching) return;
    const sessionId = useRealtimeStore.getState().sessionId;
    if (!sessionId) {
      set({ status: "error", error: "Join the office before voice." });
      return;
    }

    set({ status: "connecting", error: null });
    try {
      await joinVoice(set, false);
    } catch (error) {
      console.warn("Workbits voice connection failed", error);
      stopVoice();
      set({
        status: "error",
        identity: null,
        channel: null,
        error: error instanceof Error ? error.message : "Voice unavailable",
      });
    }
  },

  disconnect: () => {
    stopVoice();
    set({ status: "idle", identity: null, channel: null, speaking: [], muted: true });
  },

  toggleMute: async () => {
    if (get().status !== "connected" || !voiceRoom) return;
    const nextMuted = !get().muted;
    try {
      if (nextMuted) {
        await voiceRoom.localParticipant.setMicrophoneEnabled(false);
      } else {
        if (get().audioBlocked) {
          await voiceRoom.startAudio();
          set({ audioBlocked: false });
        }
        await voiceRoom.localParticipant.setMicrophoneEnabled(true);
      }
      set({ muted: nextMuted, error: null });
    } catch (error) {
      set({
        muted: true,
        error: error instanceof Error ? error.message : "Microphone permission denied",
      });
    }
  },

  syncZone: async (zone) => {
    if (get().status !== "connected" || switching) return;
    const desired: VoiceChannel = zone === "meeting" ? "meeting" : "floor";
    if (get().channel === desired) return;

    switching = true;
    const publish = !get().muted;
    stopVoice();
    set({ status: "connecting", identity: null, channel: null, speaking: [], error: null });
    try {
      await joinVoice(set, publish);
    } catch (error) {
      console.warn("Workbits voice room switch failed", error);
      stopVoice();
      set({
        status: "error",
        identity: null,
        channel: null,
        error: error instanceof Error ? error.message : "Voice unavailable",
      });
    } finally {
      switching = false;
    }
  },

  toggleDeafen: () => {
    const deafened = !get().deafened;
    set({ deafened });
    updateProximity();
  },

  enableAudio: async () => {
    if (!voiceRoom) return;
    try {
      await voiceRoom.startAudio();
      set({ audioBlocked: false });
    } catch {
      set({ audioBlocked: true });
    }
  },
}));

if (import.meta.env.DEV) {
  (window as unknown as { __WORKBITS_VOICE__: () => unknown }).__WORKBITS_VOICE__ = () => {
    const state = useVoiceStore.getState();
    return {
      status: state.status,
      identity: state.identity,
      channel: state.channel,
      muted: state.muted,
      deafened: state.deafened,
      audioBlocked: state.audioBlocked,
      error: state.error,
      speaking: state.speaking,
      volumes: { ...lastVolumes },
    };
  };
}
