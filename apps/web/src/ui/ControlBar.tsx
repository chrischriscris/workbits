import type { ReactNode } from "react";
import {
  Headphones,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Settings2,
  Smile,
  Video,
  VideoOff,
  VolumeX,
  Wand2,
} from "lucide-react";
import { useAppStore } from "../state/app";
import { useVoiceStore } from "../voice/store";
import { palette } from "../theme";

function ControlButton({
  label,
  active,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`control-button${active ? " is-active" : ""}${danger ? " is-danger" : ""}`}
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
  const cameraOn = useAppStore((state) => state.cameraOn);
  const toggleCamera = useAppStore((state) => state.toggleCamera);
  const screenOn = useAppStore((state) => state.screenOn);
  const toggleScreen = useAppStore((state) => state.toggleScreen);
  const chatOpen = useAppStore((state) => state.chatOpen);
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const setAvatarStudioOpen = useAppStore((state) => state.setAvatarStudioOpen);

  const voiceStatus = useVoiceStore((state) => state.status);
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
      ? muted
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
        title={audioBlocked ? "Enable audio" : "Proximity voice"}
      >
        <span className="voice-status__dot" style={{ background: dotColor }} />
        <span>
          <strong>Proximity</strong>
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
      <ControlButton label={cameraOn ? "Turn camera off" : "Turn camera on"} active={cameraOn} onClick={toggleCamera}>
        {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
      </ControlButton>
      <ControlButton label={screenOn ? "Stop sharing" : "Share screen"} active={screenOn} onClick={toggleScreen}>
        <MonitorUp size={18} />
      </ControlButton>
      <ControlButton label="Emotes" onClick={() => undefined}>
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
      <ControlButton label="Avatar studio" onClick={() => setAvatarStudioOpen(true)}>
        <Wand2 size={18} />
      </ControlButton>
      <ControlButton label="Settings" onClick={() => undefined}>
        <Settings2 size={18} />
      </ControlButton>
    </div>
  );
}
