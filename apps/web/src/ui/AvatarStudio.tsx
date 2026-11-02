import { ArrowLeft, Check, Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AvatarConfig } from "@workbits/shared";
import { describeAvatar, generateAvatarBases } from "../ai/avatar";
import { localCharacter } from "../data/team";
import { useRealtimeStore } from "../realtime/store";
import { useAppStore } from "../state/app";
import { useAvatarStore } from "../state/avatar";

const skinTones = [
  "#f2c9a0",
  "#e0b090",
  "#c98e6b",
  "#a86a45",
  "#7d4b32",
  "#5c3624",
  "#d9a07a",
  "#8c5a3c",
];
const hairColors = ["#1a1a1a", "#2b1b12", "#3d2a1e", "#5a3a26", "#8a5a3c", "#c9a06b", "#6b7280"];
const topColors = [
  "#1f2a44",
  "#1c1c1c",
  "#2f7d4f",
  "#d98e73",
  "#6c8cff",
  "#5c6b7a",
  "#e8dcc8",
  "#a8bfa3",
];
const hairStyles: Array<[string, string]> = [
  ["short-textured", "Short"],
  ["wavy-medium", "Wavy"],
  ["curly-medium", "Curly"],
  ["slick-short", "Slick"],
  ["medium-swept", "Swept"],
];

function AvatarPreview({ config, large }: { config: AvatarConfig; large?: boolean }) {
  return (
    <div className={`forge-preview${large ? " forge-preview--large" : ""}`} aria-hidden="true">
      <div className="forge-preview__head" style={{ background: config.skin }}>
        <div
          className="forge-preview__hair"
          style={{ background: config.hair?.color ?? "#2b1b12" }}
        />
        <div className="forge-preview__eyes">
          <span />
          <span />
        </div>
        {config.glasses && <div className="forge-preview__glasses" />}
        {config.facialHair && (
          <div
            className="forge-preview__beard"
            style={{ background: config.facialHair.color }}
          />
        )}
        {config.headwear && (
          <div className="forge-preview__cap" style={{ background: config.headwear.color }} />
        )}
      </div>
      <div className="forge-preview__body" style={{ background: config.outfit.topColor }}>
        <span style={{ background: config.outfit.bottomColor }} />
      </div>
    </div>
  );
}

function Swatches({
  label,
  colors,
  active,
  onPick,
}: {
  label: string;
  colors: string[];
  active?: string;
  onPick: (color: string) => void;
}) {
  return (
    <div className="tune-row">
      <span className="tune-row__label">{label}</span>
      <div className="tune-swatches">
        {colors.map((color) => (
          <button
            key={color}
            className={`tune-swatch${active === color ? " is-active" : ""}`}
            style={{ background: color }}
            type="button"
            aria-label={`${label} ${color}`}
            aria-pressed={active === color}
            onClick={() => onPick(color)}
          >
            {active === color && <Check size={10} />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AvatarStudio() {
  const open = useAppStore((state) => state.avatarStudioOpen);
  const setOpen = useAppStore((state) => state.setAvatarStudioOpen);
  const custom = useAvatarStore((state) => state.config);
  const setConfig = useAvatarStore((state) => state.setConfig);
  const [prompt, setPrompt] = useState("warm, creative, a little sleep-deprived, glasses optional");
  const [variants, setVariants] = useState<AvatarConfig[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<AvatarConfig | null>(null);

  const generate = () => {
    setGenerating(true);
    setEditing(null);
    window.setTimeout(() => {
      setVariants(generateAvatarBases(prompt));
      setGenerating(false);
    }, 280);
  };

  useEffect(() => {
    if (open && variants.length === 0) {
      setVariants(generateAvatarBases(prompt));
    }
    if (!open) setEditing(null);
  }, [open, prompt, variants.length]);

  if (!open) return null;

  const update = (next: Partial<AvatarConfig>) => {
    setEditing((current) => (current ? { ...current, ...next } : current));
  };

  const toggleGlasses = () => {
    if (!editing) return;
    update(
      editing.glasses
        ? { glasses: undefined }
        : { glasses: { style: "rect", color: "#3a3a3a" } },
    );
  };

  const toggleBeard = () => {
    if (!editing) return;
    update(
      editing.facialHair
        ? { facialHair: undefined }
        : { facialHair: { style: "short-beard", color: editing.hair?.color ?? "#2b1b12" } },
    );
  };

  const toggleCap = () => {
    if (!editing) return;
    update(
      editing.headwear
        ? { headwear: undefined }
        : { headwear: { style: "cap", color: editing.outfit.topColor } },
    );
  };

  const toggleChain = () => {
    if (!editing) return;
    const has = editing.accessories.includes("gold-chain");
    update({
      accessories: has
        ? editing.accessories.filter((item) => item !== "gold-chain")
        : [...editing.accessories, "gold-chain"],
    });
  };

  const saveEditing = () => {
    if (!editing) return;
    setConfig(editing);
    useRealtimeStore.getState().setAvatar(editing);
    setEditing(null);
    setOpen(false);
  };

  return (
    <div className="forge-overlay" role="presentation">
      <div className="forge" role="dialog" aria-modal="true" aria-label="Avatar studio">
        <div className="forge__head">
          <div>
            <div className="eyebrow">Avatar studio · local generator</div>
            <h2>{editing ? "Tune the look" : "Make it yours"}</h2>
            <p>
              {editing
                ? "Fine-tune the generated base. Changes are visible to everyone in the office."
                : "Describe a look. We build three bases from the modular catalog, then you can tune the details."}
            </p>
          </div>
          <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close avatar studio">
            <X size={17} />
          </button>
        </div>

        {editing ? (
          <>
            <button className="forge__back" type="button" onClick={() => setEditing(null)}>
              <ArrowLeft size={13} />
              Back to bases
            </button>

            <div className="forge-editor">
              <div className="forge-editor__preview">
                <AvatarPreview config={editing} large />
                <div className="forge-card__tags">
                  {describeAvatar(editing).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>

              <div className="forge-editor__controls">
                <Swatches
                  label="Skin"
                  colors={skinTones}
                  active={editing.skin}
                  onPick={(skin) => update({ skin })}
                />
                <Swatches
                  label="Hair color"
                  colors={hairColors}
                  active={editing.hair?.color}
                  onPick={(color) =>
                    update({
                      hair: { style: editing.hair?.style ?? "short-textured", color },
                      ...(editing.facialHair ? { facialHair: { ...editing.facialHair, color } } : {}),
                    })
                  }
                />
                <div className="tune-row">
                  <span className="tune-row__label">Hair</span>
                  <div className="tune-chips">
                    {hairStyles.map(([style, label]) => (
                      <button
                        key={style}
                        className={`tune-chip${editing.hair?.style === style ? " is-active" : ""}`}
                        type="button"
                        aria-pressed={editing.hair?.style === style}
                        onClick={() =>
                          update({
                            hair: {
                              style,
                              color: editing.hair?.color ?? hairColors[0]!,
                            },
                          })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <Swatches
                  label="Top"
                  colors={topColors}
                  active={editing.outfit.topColor}
                  onPick={(topColor) =>
                    update({
                      outfit: { ...editing.outfit, topColor },
                      palette: { ...editing.palette, primary: topColor },
                    })
                  }
                />
                <div className="tune-row">
                  <span className="tune-row__label">Extras</span>
                  <div className="tune-chips">
                    <button
                      className={`tune-chip${editing.glasses ? " is-active" : ""}`}
                      type="button"
                      aria-pressed={Boolean(editing.glasses)}
                      onClick={toggleGlasses}
                    >
                      Glasses
                    </button>
                    <button
                      className={`tune-chip${editing.facialHair ? " is-active" : ""}`}
                      type="button"
                      aria-pressed={Boolean(editing.facialHair)}
                      onClick={toggleBeard}
                    >
                      Beard
                    </button>
                    <button
                      className={`tune-chip${editing.headwear ? " is-active" : ""}`}
                      type="button"
                      aria-pressed={Boolean(editing.headwear)}
                      onClick={toggleCap}
                    >
                      Cap
                    </button>
                    <button
                      className={`tune-chip${editing.accessories.includes("gold-chain") ? " is-active" : ""}`}
                      type="button"
                      aria-pressed={editing.accessories.includes("gold-chain")}
                      onClick={toggleChain}
                    >
                      Chain
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="forge__footer">
              <span>Live preview in the office when you save.</span>
              <div className="forge__footer-actions">
                <button className="text-button" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="primary-button" type="button" onClick={saveEditing}>
                  <Check size={15} />
                  Save look
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="forge__prompt">
              <Sparkles size={16} />
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && generate()}
                placeholder="e.g. pink cap, glasses, beard, chill"
                aria-label="Avatar prompt"
              />
              <button className="primary-button" type="button" onClick={generate} disabled={generating}>
                <Wand2 size={15} />
                {generating ? "Sketching…" : "Generate 3 bases"}
              </button>
            </div>

            <div className="forge__grid">
              {variants.map((variant, index) => (
                <article key={index} className="forge-card">
                  <AvatarPreview config={variant} />
                  <div className="forge-card__body">
                    <div className="forge-card__title">
                      <strong>Base {index + 1}</strong>
                      <span>{variant.glasses ? "glasses" : "open face"}</span>
                    </div>
                    <div className="forge-card__tags">
                      {describeAvatar(variant).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <div className="forge-card__actions">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setEditing(variant)}
                      >
                        Tune
                      </button>
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => {
                          setConfig(variant);
                          useRealtimeStore.getState().setAvatar(variant);
                          setOpen(false);
                        }}
                      >
                        Use
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="forge__footer">
              <span>
                {custom
                  ? "Custom avatar active. Everyone in the office sees it."
                  : `Currently using ${localCharacter.displayName}'s preset.`}
              </span>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setConfig(null);
                  useRealtimeStore.getState().setAvatar(null);
                  setOpen(false);
                }}
              >
                Reset to team look
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
