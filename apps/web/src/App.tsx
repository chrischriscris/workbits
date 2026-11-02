import { Keyboard, MousePointer2, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { zoneAt } from "@workbits/shared";
import { useRealtimeStore } from "./realtime/store";
import { OfficeScene } from "./scene/OfficeScene";
import { useAppStore } from "./state/app";
import { useVoiceStore } from "./voice/store";
import { AssistantPanel } from "./ui/AssistantPanel";
import { AvatarStudio } from "./ui/AvatarStudio";
import { JoinOverlay } from "./ui/JoinOverlay";
import { RoomStudio } from "./ui/RoomStudio";
import { CharacterSheet } from "./ui/CharacterSheet";
import { ChatDock } from "./ui/ChatDock";
import { ControlBar } from "./ui/ControlBar";
import { Roster } from "./ui/Roster";
import { TopBar } from "./ui/TopBar";

function InteractionHint() {
  const chatOpen = useAppStore((state) => state.chatOpen);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 9000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible || chatOpen) return null;
  return (
    <div className="hint" role="status">
      <span>
        <MousePointer2 size={13} /> Click to walk
      </span>
      <span className="hint__divider" />
      <span>
        <Keyboard size={13} /> WASD
      </span>
      <span className="hint__divider" />
      <span>
        <ZoomIn size={13} /> Scroll to zoom
      </span>
    </div>
  );
}

export default function App() {
  const realtimeStatus = useRealtimeStore((state) => state.status);
  const sessionId = useRealtimeStore((state) => state.sessionId);
  const connectVoice = useVoiceStore((state) => state.connect);
  const syncVoiceZone = useVoiceStore((state) => state.syncZone);
  const localPosition = useRealtimeStore((state) => state.localPosition);
  const localZone = zoneAt(localPosition.x, localPosition.z);
  const isJoinScreen =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("join") === "1";

  useEffect(() => {
    document.title = "Workbits — Your team's place";
    if (!isJoinScreen) void useRealtimeStore.getState().connect();
  }, [isJoinScreen]);

  useEffect(() => {
    if (isJoinScreen || realtimeStatus !== "connected" || !sessionId) return;
    const voice = useVoiceStore.getState();
    if (voice.status === "connected" && voice.identity && voice.identity !== sessionId) {
      const wasUnmuted = !voice.muted;
      voice.disconnect();
      void connectVoice().then(() => {
        if (wasUnmuted) void useVoiceStore.getState().toggleMute();
      });
      return;
    }
    void connectVoice();
  }, [isJoinScreen, realtimeStatus, sessionId, connectVoice]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncVoiceZone(localZone);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [localZone, syncVoiceZone]);

  return (
    <div className="app-shell">
      <div className="scene-layer">
        <OfficeScene />
      </div>
      <div className="scene-wash" aria-hidden="true" />
      <TopBar />
      <Roster />
      <CharacterSheet />
      <ChatDock />
      <ControlBar />
      <AvatarStudio />
      <RoomStudio />
      <AssistantPanel />
      <JoinOverlay />
      <InteractionHint />
    </div>
  );
}
