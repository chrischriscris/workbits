import { Keyboard, MousePointer2, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useRealtimeStore } from "./realtime/store";
import { OfficeScene } from "./scene/OfficeScene";
import { useAppStore } from "./state/app";
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
  useEffect(() => {
    document.title = "Workbits — Your team's place";
    void useRealtimeStore.getState().connect();
  }, []);

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
      <InteractionHint />
    </div>
  );
}
