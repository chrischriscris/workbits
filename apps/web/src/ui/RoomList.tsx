import { Lock, MapPin } from "lucide-react";
import { teamCharacters, teamPack } from "../data/team";
import { palette } from "../theme";

const roomAccent: Record<string, string> = {
  lounge: palette.terracotta,
  engineering: palette.accent,
  meeting: palette.slate,
  nap: "#8b9dc3",
  kitchen: palette.amber,
  garden: palette.sageDeep,
};

export function RoomList() {
  return (
    <aside className="panel rooms" aria-label="Rooms">
      <div className="panel__header">
        <div>
          <div className="eyebrow">The loft</div>
          <h2>
            Rooms <span className="count-pill">{teamPack.office.rooms.length}</span>
          </h2>
        </div>
        <span className="rooms__live">
          <span className="live-pill__dot" />
          Live
        </span>
      </div>

      <div className="rooms__list">
        {teamPack.office.rooms.map((room) => {
          const people = teamCharacters.filter(
            (character) => character.kind === "user" && character.room === room.id,
          );
          return (
            <button key={room.id} className="room-row" type="button" title={`Go to ${room.name}`}>
              <span className="room-row__icon" style={{ background: `${roomAccent[room.id]}22` }}>
                <MapPin size={15} style={{ color: roomAccent[room.id] }} />
              </span>
              <span className="room-row__body">
                <span className="room-row__name">
                  {room.name}
                  {room.private && <Lock size={11} className="room-row__lock" />}
                </span>
                <span className="room-row__meta">
                  {people.length === 0 ? "Quiet" : people.map((person) => person.shortName).join(" · ")}
                </span>
              </span>
              <span className="room-row__count">{people.length}</span>
            </button>
          );
        })}
      </div>

      <div className="rooms__footer">
        <div className="mini-floor">
          <div className="mini-floor__plate">
            <span className="mini-floor__room mini-floor__room--lounge" />
            <span className="mini-floor__room mini-floor__room--eng" />
            <span className="mini-floor__room mini-floor__room--meet" />
            <span className="mini-floor__room mini-floor__room--nap" />
            <span className="mini-floor__you" />
          </div>
          <div>
            <strong>Floor 1</strong>
            <small>Workbits Loft</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
