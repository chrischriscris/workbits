import { create } from "zustand";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
} from "livekit-client";
import { localCharacter } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { proximityGain } from "./gain";

type VoiceStatus = "idle" | "connecting" | "connected" | "error";

type VoiceState = {
  status: VoiceStatus;
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
};

let voiceRoom: Room | null = null;
let audioContainer: HTMLDivElement | null = null;
let proximityTimer: number | null = null;

function apiBase() {
  return (
    (import.meta.env.VITE_API_URL as string | undefined) ??
    `${window.location.protocol}//${window.location.hostname}:3101`
  );
}

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
  voiceRoom?.disconnect();
  voiceRoom = null;
  audioContainer?.replaceChildren();
}

function updateProximity() {
  if (!voiceRoom) return;
  const { localPosition, players } = useRealtimeStore.getState();
  const deafened = useVoiceStore.getState().deafened;

  voiceRoom.remoteParticipants.forEach((participant: RemoteParticipant) => {
    const player = players[participant.identity];
    if (!player) {
      participant.setVolume(deafened ? 0 : 0.35);
      return;
    }
    const distance = Math.hypot(player.x - localPosition.x, player.z - localPosition.z);
    participant.setVolume(deafened ? 0 : proximityGain(distance));
  });
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  status: "idle",
  muted: true,
  deafened: false,
  audioBlocked: false,
  speaking: [],
  error: null,

  connect: async () => {
    if (get().status === "connecting" || get().status === "connected") return;
    const sessionId = useRealtimeStore.getState().sessionId;
    if (!sessionId) {
      set({ status: "error", error: "Join the office before voice." });
      return;
    }

    set({ status: "connecting", error: null });
    try {
      const params = new URLSearchParams({
        identity: sessionId,
        name: localCharacter.displayName,
        room: "office:workbits-loft",
      });
      const response = await fetch(`${apiBase()}/livekit/token?${params.toString()}`);
      if (!response.ok) throw new Error(`Token request failed (${response.status})`);
      const { token, url } = (await response.json()) as { token: string; url: string };

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      voiceRoom = room;
      ensureAudioContainer();

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
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
        set({ speaking: speakers.map((speaker) => speaker.identity) });
      });
      room.on(RoomEvent.Disconnected, () => {
        stopVoice();
        set({ status: "idle", speaking: [] });
      });

      await room.connect(url, token);
      try {
        await room.startAudio();
        set({ audioBlocked: false });
      } catch {
        set({ audioBlocked: true });
      }

      set({ status: "connected", muted: true });
      updateProximity();
      proximityTimer = window.setInterval(updateProximity, 180);
    } catch (error) {
      console.warn("Workbits voice connection failed", error);
      stopVoice();
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Voice unavailable",
      });
    }
  },

  disconnect: () => {
    stopVoice();
    set({ status: "idle", speaking: [], muted: true });
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
      muted: state.muted,
      deafened: state.deafened,
      audioBlocked: state.audioBlocked,
      error: state.error,
      speaking: state.speaking,
    };
  };
}
