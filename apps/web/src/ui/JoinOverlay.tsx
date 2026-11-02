import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { apiBase } from "../config";
import { teamCharacters } from "../data/team";
import { palette, statusColor } from "../theme";

export function JoinOverlay() {
  const params = new URLSearchParams(window.location.search);
  const hostId = params.get("host");
  const [open, setOpen] = useState(params.get("join") === "1");
  const [taken, setTaken] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState(() => {
    if (!hostId) return "chus";
    return teamCharacters.find((character) => character.id !== hostId)?.id ?? "chus";
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`${apiBase()}/occupancy`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { characters?: string[]; count?: number } | null) => {
        if (cancelled || !data) return;
        setTaken(data.characters ?? []);
        setCount(data.count ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !selected) return;
    if (taken.includes(selected) && selected !== hostId) {
      const free = teamCharacters.find(
        (character) => character.id !== hostId && !taken.includes(character.id),
      );
      if (free) setSelected(free.id);
    }
  }, [taken, hostId, open, selected]);

  if (!open) return null;

  const join = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("character", selected);
    url.searchParams.delete("join");
    window.location.href = url.toString();
  };

  const character = teamCharacters.find((item) => item.id === selected);

  return (
    <div className="forge-overlay">
      <div className="join-card" role="dialog" aria-modal="true" aria-label="Join Workbits">
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

        <div className="join-card__eyebrow">
          <Sparkles size={13} />
          You're invited to the loft
          <span className="join-card__count">
            {count > 0 ? `${count} live now` : "Be the first in"}
          </span>
        </div>
        <h2>Pick your seat.</h2>
        <p>
          Choose who you are for this session. This is the Workbits demo team — no password, no
          signup, just a browser.
        </p>

        <div className="join-grid">
          {teamCharacters.map((item) => {
            const isTaken = taken.includes(item.id) && item.id !== hostId;
            const isHost = item.id === hostId;
            return (
            <button
              key={item.id}
              className={`join-person${selected === item.id ? " is-selected" : ""}${isTaken ? " is-taken" : ""}`}
              type="button"
              disabled={isTaken || isHost}
              onClick={() => setSelected(item.id)}
            >
              <span className="join-person__avatar" style={{ background: item.avatar.palette.primary }}>
                {item.species === "frog"
                  ? "🐸"
                  : item.species === "crab"
                    ? "🦀"
                    : item.shortName.slice(0, 1)}
                <i style={{ background: statusColor[item.status] ?? palette.green }} />
              </span>
              <span>
                <strong>
                  {item.shortName}
                  {isHost && <span className="join-person__tag">host</span>}
                  {isTaken && <span className="join-person__tag join-person__tag--taken">here</span>}
                </strong>
                <small>{isTaken ? "Already in the loft" : item.role}</small>
              </span>
            </button>
            );
          })}
        </div>

        <div className="join-card__footer">
          <span>
            Joining as <strong>{character?.displayName ?? "Chus"}</strong>
          </span>
          <button className="primary-button" type="button" onClick={join}>
            Enter the loft
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
