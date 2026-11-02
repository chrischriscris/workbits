import { ArrowRight, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { teamCharacters } from "../data/team";
import { palette, statusColor } from "../theme";

export function JoinOverlay() {
  const params = new URLSearchParams(window.location.search);
  const hostId = params.get("host");
  const [open, setOpen] = useState(params.get("join") === "1");
  const [selected, setSelected] = useState(() => {
    if (!hostId) return "chus";
    return teamCharacters.find((character) => character.id !== hostId)?.id ?? "chus";
  });

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
        <button className="icon-button join-card__close" type="button" onClick={() => setOpen(false)} aria-label="Close">
          <X size={16} />
        </button>
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
        </div>
        <h2>Pick your seat.</h2>
        <p>
          Choose who you are for this session. This is the Workbits demo team — no password, no
          signup, just a browser.
        </p>

        <div className="join-grid">
          {teamCharacters.map((item) => (
            <button
              key={item.id}
              className={`join-person${selected === item.id ? " is-selected" : ""}`}
              type="button"
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
                  {item.id === hostId && <span className="join-person__tag">host</span>}
                </strong>
                <small>{item.role}</small>
              </span>
            </button>
          ))}
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
