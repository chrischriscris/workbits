import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { localCharacterId, roomLabel, teamCharacters } from "../data/team";
import { useAppStore } from "../state/app";
import { palette, statusColor } from "../theme";

const statusLabel: Record<string, string> = {
  available: "Available",
  focus: "Focus",
  away: "Away",
  meeting: "In a meeting",
};

type Filter = "all" | "online" | "away";

export function Roster() {
  const selectedId = useAppStore((state) => state.selectedId);
  const select = useAppStore((state) => state.select);
  const rosterOpen = useAppStore((state) => state.rosterOpen);
  const toggleRoster = useAppStore((state) => state.toggleRoster);
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const online = teamCharacters.filter((character) => character.status !== "away").length;
    return { online, away: teamCharacters.length - online, all: teamCharacters.length };
  }, []);

  const visible = teamCharacters.filter((character) => {
    if (filter === "online") return character.status !== "away";
    if (filter === "away") return character.status === "away";
    return true;
  });

  if (!rosterOpen) {
    return (
      <button className="roster-collapsed" type="button" onClick={toggleRoster} aria-label="Open team roster">
        <span className="live-pill__dot" />
        {counts.online} online
      </button>
    );
  }

  return (
    <aside className="panel roster" aria-label="Team roster">
      <div className="panel__header">
        <div>
          <div className="eyebrow">Your team</div>
          <h2>
            Team <span className="count-pill">{counts.all}</span>
          </h2>
        </div>
        <button className="text-button" type="button" onClick={toggleRoster} aria-label="Collapse roster">
          Hide
        </button>
      </div>

      <div className="segmented" role="tablist" aria-label="Filter team">
        {(
          [
            ["online", `Online ${counts.online}`],
            ["away", `Away ${counts.away}`],
            ["all", "All"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`segmented__item${filter === key ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="roster__list">
        {visible.map((character) => {
          const isYou = character.id === localCharacterId;
          const isSelected = selectedId === character.id;
          return (
            <button
              key={character.id}
              className={`person${isSelected ? " is-selected" : ""}`}
              type="button"
              onClick={() => select(isSelected ? null : character.id)}
              aria-pressed={isSelected}
            >
              <span className="person__avatar" style={{ background: character.avatar.palette.primary }}>
                {character.species === "frog" ? "🐸" : character.species === "crab" ? "🦀" : character.shortName.slice(0, 1)}
                <span
                  className="person__status"
                  style={{ background: statusColor[character.status] ?? palette.green }}
                />
              </span>
              <span className="person__body">
                <span className="person__name">
                  {character.displayName}
                  {isYou && <span className="you-pill">you</span>}
                </span>
                <span className="person__meta">
                  {isYou ? "Here with you" : `${statusLabel[character.status]} · ${roomLabel(character.room)}`}
                </span>
              </span>
              <span className="person__role">{character.kind === "mascot" ? "pet" : character.role}</span>
            </button>
          );
        })}
      </div>

      <div className="roster__footer">
        <button className="ghost-button ghost-button--full" type="button" title="Invite teammate">
          <UserPlus size={15} />
          Invite teammate
        </button>
        <span className="roster__hint">Demo team pack · local</span>
      </div>
    </aside>
  );
}
