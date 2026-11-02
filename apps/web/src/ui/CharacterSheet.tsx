import { ArrowRight, MapPin, MessageCircle, X } from "lucide-react";
import { zoneAt, zoneName } from "@workbits/shared";
import { localCharacterId, roomAnchors, roomLabel, teamById } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore } from "../state/app";
import { statusColor } from "../theme";
import { AvatarPortrait } from "./AvatarPortrait";

const statusLabel: Record<string, string> = {
  available: "Available",
  focus: "Focus mode",
  away: "Away",
  meeting: "In a meeting",
};

export function CharacterSheet() {
  const selectedId = useAppStore((state) => state.selectedId);
  const select = useAppStore((state) => state.select);
  const setTarget = useAppStore((state) => state.setTarget);
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const setChatTab = useAppStore((state) => state.setChatTab);
  const setDmTarget = useAppStore((state) => state.setDmTarget);
  const livePlayers = useRealtimeStore((state) => state.players);
  const character = selectedId ? teamById[selectedId] : null;

  if (!character) return null;

  const live = Object.values(livePlayers).find(
    (player) => player.characterId === character.id,
  );
  const anchor = live ? { x: live.x, z: live.z } : roomAnchors[character.room];
  const status = live?.status ?? character.status;
  const place = live ? zoneName(zoneAt(live.x, live.z)) : roomLabel(character.room);
  const isSelf = character.id === localCharacterId;

  return (
    <aside className="character-card" aria-label={`${character.displayName} profile`}>
      <div className="character-card__top">
        <span className="avatar avatar--lg" style={{ background: character.avatar.palette.primary }}>
          <AvatarPortrait
            config={live?.avatar ?? character.avatar}
            species={character.species}
            size={46}
          />
          <span
            className="avatar__status"
            style={{ background: statusColor[status] }}
          />
        </span>
        <div className="character-card__identity">
          <div className="eyebrow">{character.kind === "mascot" ? "Mascot" : character.role}</div>
          <h3>{character.displayName}</h3>
          <span className="character-card__status">
            <span className="live-pill__dot" style={{ background: statusColor[status] }} />
            {statusLabel[status] ?? status} · {place}
            {live && <span className="person__live">live</span>}
          </span>
        </div>
        <button className="icon-button icon-button--small" type="button" onClick={() => select(null)} aria-label="Close profile">
          <X size={15} />
        </button>
      </div>

      {character.persona?.tagline && <p className="character-card__quote">“{character.persona.tagline}”</p>}

      <div className="character-card__actions">
        <button
          className="primary-button"
          type="button"
          disabled={isSelf}
          title={isSelf ? "That's you" : `Message ${character.shortName}`}
          onClick={() => {
            setDmTarget(character.id);
            setChatTab("dm");
            setChatOpen(true);
          }}
        >
          <MessageCircle size={15} />
          Message
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            if (anchor) setTarget(anchor);
            select(null);
          }}
        >
          <MapPin size={15} />
          Locate
          <ArrowRight size={13} />
        </button>
      </div>
    </aside>
  );
}
