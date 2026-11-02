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
import { palette } from "../theme";

function ControlButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`control-button${active ? " is-active" : ""}${danger ? " is-danger" : ""}`}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function ControlBar() {
  const muted = useAppStore((state) => state.muted);
  const toggleMuted = useAppStore((state) => state.toggleMuted);
  const deafened = useAppStore((state) => state.deafened);
  const toggleDeafened = useAppStore((state) => state.toggleDeafened);
  const cameraOn = useAppStore((state) => state.cameraOn);
  const toggleCamera = useAppStore((state) => state.toggleCamera);
  const screenOn = useAppStore((state) => state.screenOn);
  const toggleScreen = useAppStore((state) => state.toggleScreen);
  const chatOpen = useAppStore((state) => state.chatOpen);
  const setChatOpen = useAppStore((state) => state.setChatOpen);

  return (
    <div className="controls">
      <div className="voice-status">
        <span className="voice-status__dot" style={{ background: palette.green }} />
        <span>
          <strong>Proximity</strong>
          <small>{muted ? "mic off" : "listening"}</small>
        </span>
      </div>
      <div className="controls__divider" />
      <ControlButton label={muted ? "Unmute microphone" : "Mute microphone"} active={!muted} danger={muted} onClick={toggleMuted}>
        {muted ? <MicOff size={18} /> : <Mic size={18} />}
      </ControlButton>
      <ControlButton label={deafened ? "Undeafen" : "Deafen"} active={deafened} onClick={toggleDeafened}>
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
      <ControlButton label="Customize office" onClick={() => undefined}>
        <Wand2 size={18} />
      </ControlButton>
      <ControlButton label="Settings" onClick={() => undefined}>
        <Settings2 size={18} />
      </ControlButton>
    </div>
  );
}
