import { Bell, ChevronDown, LayoutGrid, Lock, MapPin, Search, Settings2, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  localCharacter,
  localCharacterId,
  roomAnchors,
  teamById,
  teamCharacters,
  teamPack,
} from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore } from "../state/app";
import { useAvatarStore } from "../state/avatar";
import { palette, statusColor } from "../theme";

type OpenMenu = "user" | "office" | null;

export function TopBar() {
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const setChatTab = useAppStore((state) => state.setChatTab);
  const setTarget = useAppStore((state) => state.setTarget);
  const realtimeStatus = useRealtimeStore((state) => state.status);
  const players = useRealtimeStore((state) => state.players);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const customAvatar = useAvatarStore((state) => state.config);
  const avatarColor = customAvatar?.palette.primary ?? localCharacter.avatar.palette.primary;

  const switchCharacter = (characterId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("character", characterId);
    window.location.href = url.toString();
  };

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

        <div className="office-wrap">
          <button
            className="office-switcher"
            type="button"
            title="Navigate rooms"
            aria-expanded={openMenu === "office"}
            onClick={() => setOpenMenu(openMenu === "office" ? null : "office")}
          >
            <span className="office-switcher__icon">
              <LayoutGrid size={15} strokeWidth={2.2} />
            </span>
            <span className="office-switcher__text">
              <strong>Workbits Loft</strong>
              <small>Floor 1</small>
            </span>
            <ChevronDown size={14} className="office-switcher__chevron" />
          </button>

          {openMenu === "office" && (
            <>
              <button className="menu-scrim" type="button" onClick={() => setOpenMenu(null)} aria-label="Close rooms" />
              <div className="user-menu office-menu">
                <div className="user-menu__label">Rooms · Floor 1</div>
                {teamPack.office.rooms.map((room) => {
                  const people = teamCharacters.filter(
                    (character) => character.kind === "user" && character.room === room.id,
                  );
                  return (
                    <button
                      key={room.id}
                      className="office-menu__item"
                      type="button"
                      onClick={() => {
                        setTarget(roomAnchors[room.id] ?? null);
                        setOpenMenu(null);
                      }}
                    >
                      <span className="office-menu__icon">
                        <MapPin size={14} />
                      </span>
                      <span>
                        <strong>
                          {room.name}
                          {room.private && <Lock size={10} />}
                        </strong>
                        <small>
                          {people.length === 0
                            ? "Quiet"
                            : people.map((person) => person.shortName).join(" · ")}
                        </small>
                      </span>
                      <span className="office-menu__count">{people.length}</span>
                    </button>
                  );
                })}
                <div className="user-menu__hint">Walk there with your avatar. More floors coming next.</div>
              </div>
            </>
          )}
        </div>
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
        <div className="user-wrap">
          <button
            className="user-chip"
            type="button"
            title="Switch demo character"
            aria-expanded={openMenu === "user"}
            onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}
          >
            <span className="avatar avatar--sm" style={{ background: avatarColor }}>
              {localCharacter.shortName.slice(0, 1)}
              <span className="avatar__status" style={{ background: statusColor.available }} />
            </span>
            <span className="user-chip__text">
              <strong>{localCharacter.shortName}</strong>
              <small>{localCharacter.role}</small>
            </span>
            <Settings2 size={14} className="user-chip__gear" />
          </button>

          {openMenu === "user" && (
            <>
              <button className="menu-scrim" type="button" onClick={() => setOpenMenu(null)} aria-label="Close menu" />
              <div className="user-menu">
                <div className="user-menu__label">Demo as</div>
                {teamCharacters.map((character) => (
                  <button
                    key={character.id}
                    className={`user-menu__item${character.id === localCharacterId ? " is-current" : ""}`}
                    type="button"
                    onClick={() => switchCharacter(character.id)}
                  >
                    <span
                      className="person__avatar person__avatar--menu"
                      style={{ background: character.avatar.palette.primary }}
                    >
                      {character.species === "frog"
                        ? "🐸"
                        : character.species === "crab"
                          ? "🦀"
                          : character.shortName.slice(0, 1)}
                    </span>
                    <span>
                      <strong>{character.shortName}</strong>
                      <small>{character.role}</small>
                    </span>
                    {character.id === localCharacterId && <span className="you-pill">you</span>}
                  </button>
                ))}
                <div className="user-menu__hint">
                  Open a second tab with another character to test presence.
                </div>
              </div>
            </>
          )}
        </div>
        <span className="demo-badge">Demo</span>
      </div>
    </header>
  );
}
