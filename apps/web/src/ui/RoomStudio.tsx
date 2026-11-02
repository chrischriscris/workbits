import { LayoutTemplate, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { generateOfficeLayouts } from "../ai/office";
import { useAppStore } from "../state/app";
import { useRealtimeStore } from "../realtime/store";
import { defaultLayout, useOfficeLayout, type OfficeLayout } from "../state/officeLayout";

function PlanPreview({ layout }: { layout: OfficeLayout }) {
  return (
    <div className="plan" aria-hidden="true">
      {layout.desks.map((desk) => {
        const chairZ = desk.z + (desk.rotation === 0 ? 0.95 : -0.95);
        return (
          <div key={desk.id}>
            <span
              className="plan__desk"
              style={{
                left: `${((desk.x + 4) / 8) * 100}%`,
                top: `${((desk.z - 0.3) / 6.2) * 100}%`,
                transform: `translate(-50%, -50%) rotate(${desk.rotation === 0 ? 0 : 180}deg)`,
              }}
            >
              <span />
            </span>
            <span
              className="plan__chair"
              style={{
                left: `${((desk.x + 4) / 8) * 100}%`,
                top: `${((chairZ - 0.3) / 6.2) * 100}%`,
              }}
            />
          </div>
        );
      })}
      <span className="plan__label">Engineering</span>
    </div>
  );
}

export function RoomStudio() {
  const open = useAppStore((state) => state.roomStudioOpen);
  const setOpen = useAppStore((state) => state.setRoomStudioOpen);
  const layout = useOfficeLayout((state) => state.layout);
  const applyLayout = useOfficeLayout((state) => state.applyLayout);
  const resetLayout = useOfficeLayout((state) => state.resetLayout);
  const [prompt, setPrompt] = useState("collaborative six-person pod, warm and green");
  const [variants, setVariants] = useState<OfficeLayout[]>([]);
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setVariants(generateOfficeLayouts(prompt));
      setGenerating(false);
    }, 280);
  };

  useEffect(() => {
    if (open && variants.length === 0) {
      setVariants(generateOfficeLayouts(prompt));
    }
  }, [open, prompt, variants.length]);

  if (!open) return null;

  return (
    <div className="forge-overlay" role="presentation">
      <div className="forge room-studio" role="dialog" aria-modal="true" aria-label="Workspace studio">
        <div className="forge__head">
          <div>
            <div className="eyebrow">Workspace studio · local generator</div>
            <h2>Shape the pod</h2>
            <p>
              Describe how the team works. We generate three desk layouts from the catalog and apply
              them to the engineering pod. No API key needed.
            </p>
          </div>
          <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close workspace studio">
            <X size={17} />
          </button>
        </div>

        <div className="forge__prompt">
          <LayoutTemplate size={16} />
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && generate()}
            placeholder="e.g. six people, collaborative, green rug"
            aria-label="Workspace prompt"
          />
          <button className="primary-button" type="button" onClick={generate} disabled={generating}>
            <Sparkles size={15} />
            {generating ? "Laying out…" : "Generate 3 layouts"}
          </button>
        </div>

        <div className="plan-grid">
          {variants.map((variant) => (
            <article key={variant.id} className="plan-card">
              <PlanPreview layout={variant} />
              <div className="plan-card__body">
                <div className="plan-card__title">
                  <strong>{variant.name}</strong>
                  <span>{variant.desks.length} desks</span>
                </div>
                <p>{variant.note}</p>
                <button
                  className="ghost-button ghost-button--full"
                  type="button"
                  onClick={() => {
                    applyLayout(variant);
                    useRealtimeStore.getState().sendLayout(variant);
                    setOpen(false);
                  }}
                >
                  Use this layout
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="forge__footer">
          <span>
            Active: <strong>{layout.name}</strong> · {layout.note}. Changes the engineering pod only.
          </span>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              resetLayout();
              useRealtimeStore.getState().sendLayout(defaultLayout);
            }}
          >
            Reset to studio rows
          </button>
        </div>
      </div>
    </div>
  );
}
