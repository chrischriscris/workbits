import { useState, type ReactNode } from "react";
import {
  Headphones,
  LayoutTemplate,
  MessageCircle,
  Mic,
  MicOff,
  Smile,
  VolumeX,
  Wand2,
} from "lucide-react";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore } from "../state/app";
import { useVoiceStore } from "../voice/store";
import { palette } from "../theme";

function ControlButton({
  label,
  active,
  danger,
  disabled,
  hideMobile,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  hideMobile?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`control-button${active ? " is-active" : ""}${danger ? " is-danger" : ""}${hideMobile ? " control-button--hide-mobile" : ""}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function ControlBar() {
  const chatOpen = useAppStore((state) => state.chatOpen);
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const setAvatarStudioOpen = useAppStore((state) => state.setAvatarStudioOpen);
  const setRoomStudioOpen = useAppStore((state) => state.setRoomStudioOpen);
  const sendEmote = useRealtimeStore((state) => state.sendEmote);
  const [emoteOpen, setEmoteOpen] = useState(false);

  const voiceStatus = useVoiceStore((state) => state.status);
  const voiceChannel = useVoiceStore((state) => state.channel);
  const muted = useVoiceStore((state) => state.muted);
  const deafened = useVoiceStore((state) => state.deafened);
  const audioBlocked = useVoiceStore((state) => state.audioBlocked);
  const toggleMute = useVoiceStore((state) => state.toggleMute);
  const toggleDeafen = useVoiceStore((state) => state.toggleDeafen);
  const enableAudio = useVoiceStore((state) => state.enableAudio);

  const handleMic = () => {
    if (voiceStatus === "connected") {
      if (audioBlocked) void enableAudio();
      void toggleMute();
    } else if (voiceStatus === "idle" || voiceStatus === "error") {
      void useVoiceStore
        .getState()
        .connect()
        .then(() => useVoiceStore.getState().toggleMute());
    }
  };

  const statusLabel =
    voiceStatus === "connected"
      ? voiceChannel === "meeting"
        ? muted
          ? "private · mic off"
          : "private · live"
        : muted
          ? "mic off"
          : "live"
      : voiceStatus === "connecting"
        ? "joining"
        : voiceStatus === "error"
          ? "unavailable"
          : "off";
  const dotColor =
    voiceStatus === "error"
      ? palette.red
      : voiceStatus === "connected" && !muted
        ? palette.green
        : voiceStatus === "connecting"
          ? palette.amber
          : palette.slate;

  return (
    <div className="controls">
      <button
        className="voice-status"
        type="button"
        onClick={() => {
          if (audioBlocked) void enableAudio();
          else if (voiceStatus === "idle" || voiceStatus === "error") {
            void useVoiceStore.getState().connect();
          }
        }}
        title={audioBlocked ? "Enable audio" : voiceChannel === "meeting" ? "Private meeting-room voice" : "Proximity voice"}
      >
        <span className="voice-status__dot" style={{ background: dotColor }} />
        <span>
          <strong>{voiceChannel === "meeting" ? "Meeting room" : "Proximity"}</strong>
          <small>{audioBlocked ? "tap to enable audio" : statusLabel}</small>
        </span>
      </button>
      <div className="controls__divider" />
      <ControlButton
        label={muted ? "Join / unmute microphone" : "Mute microphone"}
        active={!muted && voiceStatus === "connected"}
        danger={muted}
        onClick={handleMic}
      >
        {muted ? <MicOff size={18} /> : <Mic size={18} />}
      </ControlButton>
      <ControlButton label={deafened ? "Undeafen" : "Deafen"} active={deafened} onClick={toggleDeafen}>
        {deafened ? <VolumeX size={18} /> : <Headphones size={18} />}
      </ControlButton>
      <ControlButton label="Emotes" active={emoteOpen} onClick={() => setEmoteOpen((open) => !open)} hideMobile>
        <Smile size={18} />
      </ControlButton>
      <div className="controls__divider" />
      <ControlButton
        label={chatOpen ? "Close chat" : "Open chat"}
        active={chatOpen}
        onClick={() => setChatOpen(!chatOpen)}
      >
        <MessageCircle size={18} />
      </ControlButton>
      <ControlButton label="Office studio" onClick={() => setRoomStudioOpen(true)} hideMobile>
        <LayoutTemplate size={18} />
      </ControlButton>
      <ControlButton label="Avatar studio" onClick={() => setAvatarStudioOpen(true)} hideMobile>
        <Wand2 size={18} />
      </ControlButton>
      {emoteOpen && (
        <div className="emote-menu" role="menu" aria-label="Emotes">
          {([
            ["wave", "👋", "Wave"],
            ["clap", "👏", "Clap"],
            ["heart", "❤️", "Heart"],
          ] as Array<[string, string, string]>).map(([kind, emoji, label]) => (
            <button
              key={kind}
              className="emote-menu__item"
              type="button"
              role="menuitem"
              onClick={() => {
                sendEmote(kind);
                setEmoteOpen(false);
              }}
            >
              <span>{emoji}</span>
              <small>{label}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
