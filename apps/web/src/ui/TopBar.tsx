import { Bell, ChevronDown, LayoutGrid, Search, Settings2, Sparkles } from "lucide-react";
import { localCharacter } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore } from "../state/app";

export function TopBar() {
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const setChatTab = useAppStore((state) => state.setChatTab);
  const realtimeStatus = useRealtimeStore((state) => state.status);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="brand__text">
            <strong>Workbits</strong>
            <span>your team's place</span>
          </div>
        </div>
        <button className="office-switcher" type="button" title="Switch office">
          <span className="office-switcher__icon">
            <LayoutGrid size={15} strokeWidth={2.2} />
          </span>
          <span className="office-switcher__text">
            <strong>Workbits Loft</strong>
            <small>Floor 1</small>
          </span>
          <ChevronDown size={14} className="office-switcher__chevron" />
        </button>
      </div>

      <div className="topbar__center">
        <span className={`live-pill${realtimeStatus === "offline" ? " live-pill--offline" : ""}`}>
          <span className="live-pill__dot" />
          {realtimeStatus === "connected" ? "Live" : realtimeStatus === "connecting" ? "Connecting" : "Local"}
        </span>
        <span className="topbar__date">Tuesday, Nov 2</span>
      </div>

      <div className="topbar__right">
        <button
          className="icon-button"
          type="button"
          aria-label="Ask Workbits AI"
          title="Ask Workbits AI"
          onClick={() => {
            setChatTab("office");
            setChatOpen(true);
          }}
        >
          <Sparkles size={17} />
        </button>
        <button className="icon-button" type="button" aria-label="Search" title="Search">
          <Search size={17} />
        </button>
        <button className="icon-button icon-button--badge" type="button" aria-label="Notifications" title="Notifications">
          <Bell size={17} />
          <span className="icon-button__badge" />
        </button>
        <span className="topbar__divider" />
        <button className="user-chip" type="button" title="Account settings">
          <span className="avatar avatar--sm" style={{ background: localCharacter.avatar.palette.primary }}>
            {localCharacter.shortName.slice(0, 1)}
            <span className="avatar__status" style={{ background: "#58b98a" }} />
          </span>
          <span className="user-chip__text">
            <strong>{localCharacter.shortName}</strong>
            <small>{localCharacter.role}</small>
          </span>
          <Settings2 size={14} className="user-chip__gear" />
        </button>
        <span className="demo-badge">Demo</span>
      </div>
    </header>
  );
}
