import { describe, expect, test } from "bun:test";
import { generateAvatarBases } from "./avatar";

describe("generateAvatarBases", () => {
  test("returns three deterministic bases", () => {
    const first = generateAvatarBases("warm, creative, glasses optional");
    const second = generateAvatarBases("warm, creative, glasses optional");
    expect(first).toHaveLength(3);
    expect(first).toEqual(second);
  });

  test("prompt hints reach the catalog output", () => {
    const bases = generateAvatarBases("pink cap, glasses, beard, formal suit");
    for (const base of bases) {
      expect(base.headwear?.style).toBe("cap");
      expect(base.glasses).toBeDefined();
      expect(base.facialHair).toBeDefined();
      expect(base.outfit.top).toBe("suit-jacket");
    }
  });

  test("every base has a complete outfit and palette", () => {
    for (const base of generateAvatarBases("anything")) {
      expect(base.skin).toMatch(/^#/);
      expect(base.outfit.topColor).toMatch(/^#/);
      expect(base.outfit.bottomColor).toMatch(/^#/);
      expect(base.palette.primary).toMatch(/^#/);
      expect(base.accessories).toBeArray();
    }
  });

  test("different prompts produce different looks", () => {
    const a = JSON.stringify(generateAvatarBases("quiet and formal"));
    const b = JSON.stringify(generateAvatarBases("playful and green"));
    expect(a).not.toBe(b);
  });
});
