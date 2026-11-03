import { Building2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildOffice, seatsOf, type OfficeParams, type RoomType, type SpaceDoc } from "@workbits/shared";
import { suggestOffices, type OfficeSuggestion } from "../ai/office";
import { useAppStore } from "../state/app";
import { useRealtimeStore } from "../realtime/store";
import { useSpace } from "../state/space";

const roomFill: Record<RoomType, string> = {
  meeting: "#e8c4b4",
  kitchen: "#ecd9bb",
  lounge: "#cfdcc7",
  nap: "#e7d3dc",
  focus: "#d4dde6",
  desks: "#efe7da",
  open: "#efe7da",
};

/** Top-down plan of a built office: rooms, glass, desk pods. */
function PlanPreview({ doc }: { doc: SpaceDoc }) {
  const { floor } = doc;
  const pods = doc.items.filter((item) => item.key === "DeskPod" || item.key === "Desk");
  return (
    <svg className="plan plan--svg" viewBox={`${floor.x - 0.3} ${floor.z - 0.3} ${floor.w + 0.6} ${floor.d + 0.6}`} aria-hidden="true">
      <rect x={floor.x} y={floor.z} width={floor.w} height={floor.d} rx={0.2} fill="#f6f0e6" stroke="#d3c6b3" strokeWidth={0.08} />
      <line x1={floor.x} y1={floor.z} x2={floor.x + floor.w} y2={floor.z} stroke="#b9ab97" strokeWidth={0.22} />
      <line x1={floor.x} y1={floor.z} x2={floor.x} y2={floor.z + floor.d} stroke="#b9ab97" strokeWidth={0.22} />
      {doc.rooms.map((room) => (
        <rect key={room.id} x={room.rect.x} y={room.rect.z} width={room.rect.w} height={room.rect.d} fill={roomFill[room.type]} opacity={0.85} />
      ))}
      {doc.edges.map((edge) => (
        <line key={edge.id} x1={edge.a.x} y1={edge.a.z} x2={edge.b.x} y2={edge.b.z} stroke="#5d6672" strokeWidth={0.07} />
      ))}
      {pods.map((item) => {
        const w = item.key === "DeskPod" ? Number(item.params?.deskWidth ?? 1.8) * 2 : Number(item.params?.width ?? 1.6);
        const d = item.key === "DeskPod" ? Number(item.params?.deskDepth ?? 1.0) * 2 : Number(item.params?.depth ?? 0.8);
        return (
          <rect
            key={item.id}
            x={item.at.x - w / 2}
            y={item.at.z - d / 2}
            width={w}
            height={d}
            rx={0.08}
            fill="#d9b98c"
            transform={`rotate(${(-(item.rot ?? 0) * 180) / Math.PI} ${item.at.x} ${item.at.z})`}
          />
        );
      })}
    </svg>
  );
}

function OfficeCard({ suggestion, onUse }: { suggestion: OfficeSuggestion; onUse: (office: OfficeParams) => void }) {
  const doc = useMemo(() => buildOffice(suggestion.office), [suggestion.office]);
  const seats = seatsOf(doc).length;
  return (
    <article className="plan-card">
      <PlanPreview doc={doc} />
      <div className="plan-card__body">
        <div className="plan-card__title">
          <strong>{suggestion.title}</strong>
          <span>{seats} seats</span>
        </div>
        <p>
          {suggestion.note} · {doc.rooms.map((room) => room.name).join(", ")}
        </p>
        <button className="ghost-button ghost-button--full" type="button" onClick={() => onUse(suggestion.office)}>
          Use this office
        </button>
      </div>
    </article>
  );
}

/**
 * Office studio (ADR-015): describe the team, pick one of three generated
 * offices. Only the parameters go to the server, which builds the same office
 * for everyone.
 */
export function OfficeStudio() {
  const open = useAppStore((state) => state.roomStudioOpen);
  const setOpen = useAppStore((state) => state.setRoomStudioOpen);
  const current = useSpace((state) => state.doc);
  const [prompt, setPrompt] = useState("a team of twelve, two meeting rooms, a quiet nap room");
  const [suggestions, setSuggestions] = useState<OfficeSuggestion[]>([]);
  const [round, setRound] = useState(0);

  const generate = (text = prompt, bump = round) => setSuggestions(suggestOffices(text, bump));

  useEffect(() => {
    if (open && suggestions.length === 0) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const use = (office: OfficeParams) => {
    useSpace.getState().setOffice(office);
    useRealtimeStore.getState().sendSpace(office);
    setOpen(false);
  };

  return (
    <div className="forge-overlay" role="presentation">
      <div className="forge room-studio" role="dialog" aria-modal="true" aria-label="Office studio">
        <div className="forge__head">
          <div>
            <div className="eyebrow">Office studio · templates + room kits</div>
            <h2>Build the office</h2>
            <p>
              Describe the team. We pick three plans that seat everyone and furnish every room. Everyone in the
              office switches with you. No API key needed.
            </p>
          </div>
          <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close office studio">
            <X size={17} />
          </button>
        </div>

        <div className="forge__prompt">
          <Building2 size={16} />
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && generate()}
            placeholder="e.g. 14 people, no nap room"
            aria-label="Office prompt"
          />
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              const next = round + 1;
              setRound(next);
              generate(prompt, next);
            }}
          >
            <Sparkles size={15} />
            Generate 3 offices
          </button>
        </div>

        <div className="plan-grid">
          {suggestions.map((suggestion) => (
            <OfficeCard key={JSON.stringify(suggestion.office)} suggestion={suggestion} onUse={use} />
          ))}
        </div>

        <div className="forge__footer">
          <span>
            Active: <strong>{current.name}</strong> · {current.floor.w.toFixed(0)} × {current.floor.d.toFixed(0)} m ·{" "}
            {seatsOf(current).length} seats
          </span>
          <button className="text-button" type="button" onClick={() => use({ template: "loft", headcount: 8, seed: 1 })}>
            Back to the loft
          </button>
        </div>
      </div>
    </div>
  );
}
