import type { AvatarConfig } from "@workbits/shared";
import { palette } from "../theme";

const skins = ["#f2c9a0", "#e0b090", "#c98e6b", "#a86a45", "#7d4b32", "#5c3624", "#d9a07a", "#8c5a3c"];
const hairColors = ["#1a1a1a", "#2b1b12", "#3d2a1e", "#5a3a26", "#8a5a3c", "#c9a06b", "#6b7280"];
const hairStyles = ["short-textured", "wavy-medium", "curly-medium", "slick-short", "medium-swept"];
const tops = ["crew-tee", "graphic-tee", "hoodie", "suit-jacket", "sweater"];
const bottoms = ["jeans", "chinos", "cream-chinos", "suit-pants"];
const shoes = ["sneakers", "dress-shoes"];
const topColors = ["#1f2a44", "#1c1c1c", "#2f7d4f", "#d98e73", "#6c8cff", "#5c6b7a", "#e8dcc8", "#a8bfa3"];
const bottomColors = ["#2e3440", "#3a4a5a", "#1b1b1b", "#e8dcc8", "#5c6b7a"];
const promptPalette = {
  pink: "#e07a9a",
  green: "#4f9d76",
  sage: "#8fae88",
  blue: "#4f6ef0",
  navy: "#1f2a44",
  black: "#1c1c1c",
  cream: "#e8dcc8",
  gold: "#d4af37",
  terra: "#c9795d",
  terracotta: "#c9795d",
  purple: "#8b7bd8",
  red: "#d94b4b",
};

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function randomFor(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(values: T[], random: () => number) {
  return values[Math.floor(random() * values.length)] ?? values[0]!;
}

function colorFromPrompt(prompt: string) {
  for (const [word, color] of Object.entries(promptPalette)) {
    if (prompt.includes(word)) return color;
  }
  return null;
}

export function generateAvatarBases(prompt: string): AvatarConfig[] {
  const normalized = prompt.toLowerCase();
  const baseSeed = hash(normalized || "workbits");

  return [0, 1, 2].map((variant) => {
    const random = randomFor(baseSeed + variant * 7919);
    const skin = pick(skins, random);
    const hairColor = pick(hairColors, random);
    const hairStyle = normalized.includes("curly")
      ? "curly-medium"
      : normalized.includes("wavy")
        ? "wavy-medium"
        : normalized.includes("slick")
          ? "slick-short"
          : pick(hairStyles, random);
    const formal = normalized.includes("suit") || normalized.includes("formal");
    const hoodie = normalized.includes("hoodie") || normalized.includes("chill");
    const top = formal ? "suit-jacket" : hoodie ? "hoodie" : pick(tops, random);
    const bottom = formal ? "suit-pants" : top === "suit-jacket" ? "chinos" : pick(bottoms, random);
    const accent = colorFromPrompt(normalized) ?? pick(topColors, random);
    const accessories = new Set<string>();
    if (normalized.includes("gold")) {
      accessories.add("gold-chain");
      accessories.add("gold-watch");
    }
    if (normalized.includes("beard")) accessories.add("beard");
    if (normalized.includes("earbud") || normalized.includes("headphones")) accessories.add("earbud");
    if (normalized.includes("sleep")) accessories.add("sleep-mask");

    return {
      species: "human",
      body: pick(["male-slim", "male-average", "male-average", "male-broad"], random),
      skin,
      hair: { style: hairStyle, color: hairColor },
      facialHair: normalized.includes("beard")
        ? { style: "full-beard", color: hairColor }
        : normalized.includes("goatee")
          ? { style: "goatee", color: hairColor }
          : normalized.includes("mustache")
            ? { style: "mustache-goatee", color: hairColor }
            : variant === 0 && !formal
              ? { style: "short-beard", color: hairColor }
              : undefined,
      glasses: normalized.includes("sunglasses")
        ? { style: "sunglasses", color: "#111111" }
        : normalized.includes("glasses")
          ? { style: "rect", color: "#3a3a3a" }
          : variant === 1
            ? { style: "rect", color: "#3a3a3a" }
            : undefined,
      headwear:
        normalized.includes("cap") || normalized.includes("hat")
          ? { style: "cap", color: accent }
          : undefined,
      outfit: {
        top,
        topColor: formal ? "#1b1b1b" : accent,
        bottom,
        bottomColor: formal ? "#1b1b1b" : pick(bottomColors, random),
        shoes: formal ? "dress-shoes" : pick(shoes, random),
        shoesColor: formal ? "#111111" : "#f5f5f5",
      },
      accessories: [...accessories],
      palette: {
        primary: formal ? "#1b1b1b" : accent,
        secondary: palette.oak,
        accent: palette.accent,
      },
    };
  });
}

export function describeAvatar(config: AvatarConfig) {
  const tags = [
    config.hair?.style?.replace("-", " ") ?? "bald",
    config.facialHair?.style?.replace("-", " "),
    config.glasses?.style,
    config.headwear?.style,
    config.outfit.top.replace("-", " "),
    ...config.accessories.filter((item) => item !== "beard"),
  ].filter(Boolean);
  return tags.slice(0, 4);
}
