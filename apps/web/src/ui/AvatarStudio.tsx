import { Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AvatarConfig } from "@workbits/shared";
import { describeAvatar, generateAvatarBases } from "../ai/avatar";
import { localCharacter } from "../data/team";
import { useAppStore } from "../state/app";
import { useAvatarStore } from "../state/avatar";

function AvatarPreview({ config }: { config: AvatarConfig }) {
  return (
    <div className="forge-preview" aria-hidden="true">
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

export function AvatarStudio() {
  const open = useAppStore((state) => state.avatarStudioOpen);
  const setOpen = useAppStore((state) => state.setAvatarStudioOpen);
  const custom = useAvatarStore((state) => state.config);
  const setConfig = useAvatarStore((state) => state.setConfig);
  const [prompt, setPrompt] = useState("warm, creative, a little sleep-deprived, glasses optional");
  const [variants, setVariants] = useState<AvatarConfig[]>([]);
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setVariants(generateAvatarBases(prompt));
      setGenerating(false);
    }, 280);
  };

  useEffect(() => {
    if (open && variants.length === 0) {
      setVariants(generateAvatarBases(prompt));
    }
  }, [open, prompt, variants.length]);

  if (!open) return null;

  return (
    <div className="forge-overlay" role="presentation">
      <div className="forge" role="dialog" aria-modal="true" aria-label="Avatar studio">
        <div className="forge__head">
          <div>
            <div className="eyebrow">Avatar studio · local generator</div>
            <h2>Make it yours</h2>
            <p>Describe a look. We build three bases from the modular catalog — no API key needed.</p>
          </div>
          <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close avatar studio">
            <X size={17} />
          </button>
        </div>

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
                <button
                  className="ghost-button ghost-button--full"
                  type="button"
                  onClick={() => {
                    setConfig(variant);
                    setOpen(false);
                  }}
                >
                  Use this base
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="forge__footer">
          <span>
            {custom ? "Custom avatar active. Remote teammates see your team preset in this demo." : `Currently using ${localCharacter.displayName}'s preset.`}
          </span>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setConfig(null);
              setOpen(false);
            }}
          >
            Reset to team look
          </button>
        </div>
      </div>
    </div>
  );
}
