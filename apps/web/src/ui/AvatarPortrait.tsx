import type { AvatarConfig, Species } from "@workbits/shared";

export function AvatarPortrait({
  config,
  species = "human",
  size = 36,
  className = "",
}: {
  config: AvatarConfig;
  species?: Species;
  size?: number;
  className?: string;
}) {
  const tint = `color-mix(in srgb, ${config.palette.primary} 16%, #fffdf8)`;

  if (species === "frog" || species === "crab") {
    return (
      <span
        className={`portrait portrait--emoji ${className}`}
        style={{ width: size, height: size, background: tint, fontSize: size * 0.55 }}
        aria-hidden="true"
      >
        <span>{species === "frog" ? "🐸" : "🦀"}</span>
      </span>
    );
  }

  const hairColor = config.hair?.color ?? "#2b1b12";
  return (
    <span
      className={`portrait ${className}`}
      style={{ width: size, height: size, background: tint }}
      aria-hidden="true"
    >
      <span className="portrait__body" style={{ background: config.outfit.topColor }} />
      <span className="portrait__head" style={{ background: config.skin }}>
        {config.hair && (
          <span
            className="portrait__hair"
            style={{ background: hairColor, borderColor: hairColor }}
          />
        )}
        <span className="portrait__eyes">
          <span />
          <span />
        </span>
        <span className="portrait__smile" />
        {config.headwear && (
          <span className="portrait__cap" style={{ background: config.headwear.color }} />
        )}
      </span>
    </span>
  );
}
