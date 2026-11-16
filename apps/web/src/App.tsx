import { Keyboard, MousePointer2, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { spaceOf } from "@workbits/shared";
import { useSpace } from "./state/space";
import { useRealtimeStore } from "./realtime/store";
import { OfficeScene } from "./scene/OfficeScene";
import { useAppStore } from "./state/app";
import { useVoiceStore } from "./voice/store";
import { AssistantPanel } from "./ui/AssistantPanel";
import { AvatarStudio } from "./ui/AvatarStudio";
import { JoinOverlay } from "./ui/JoinOverlay";
import { OfficeStudio } from "./ui/OfficeStudio";
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
  const realtimeReady = useRealtimeStore((state) => state.ready);
  const connectVoice = useVoiceStore((state) => state.connect);
  const syncVoiceZone = useVoiceStore((state) => state.syncZone);
  const doc = useSpace((state) => state.doc);
  // Subscribe to the room id (a string), not the position object: the position
  // updates every 70-450 ms and re-rendering App re-renders the whole scene.
  const localZone = useRealtimeStore((state) => spaceOf(doc).roomAt(state.localPosition.x, state.localPosition.z).id);
  const localPrivate = doc.rooms.some((room) => room.id === localZone && room.privacy === "private");
  const isJoinScreen =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("join") === "1";
  const artMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("art");

  useEffect(() => {
    document.title = "Workbits — Your team's place";
    if (!isJoinScreen && !artMode) void useRealtimeStore.getState().connect();
  }, [artMode, isJoinScreen]);

  useEffect(() => {
    if (artMode || isJoinScreen || realtimeStatus !== "connected" || !sessionId || !realtimeReady) {
      return;
    }
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
  }, [artMode, isJoinScreen, realtimeStatus, realtimeReady, sessionId, connectVoice]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncVoiceZone(localZone, localPrivate);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [localZone, localPrivate, syncVoiceZone]);

  return (
    <div className={`app-shell${artMode ? " app-shell--art" : ""}`}>
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
      <OfficeStudio />
      <AssistantPanel />
      <JoinOverlay />
      <InteractionHint />
    </div>
  );
}
