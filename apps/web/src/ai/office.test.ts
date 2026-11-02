import { describe, expect, test } from "bun:test";
import { generateOfficeLayouts } from "./office";

describe("generateOfficeLayouts", () => {
  test("returns three deterministic layouts", () => {
    const first = generateOfficeLayouts("collaborative six-person pod, warm and green");
    const second = generateOfficeLayouts("collaborative six-person pod, warm and green");
    expect(first).toHaveLength(3);
    expect(first).toEqual(second);
  });

  test("six-person prompts produce a six-desk layout", () => {
    const layouts = generateOfficeLayouts("six people, collaborative, green rug");
    expect(layouts[0]?.desks).toHaveLength(6);
    expect(layouts[0]?.rug).toBe("sage");
  });

  test("desks stay inside the engineering pod and on the variant grid", () => {
    for (const layout of generateOfficeLayouts("anything")) {
      for (const desk of layout.desks) {
        expect(desk.x).toBeGreaterThanOrEqual(-3.4);
        expect(desk.x).toBeLessThanOrEqual(3.4);
        expect(desk.z).toBeGreaterThanOrEqual(0.4);
        expect(desk.z).toBeLessThanOrEqual(5.9);
        expect(desk.variant).toBeInteger();
        expect(desk.variant).toBeGreaterThanOrEqual(0);
        expect(desk.variant).toBeLessThanOrEqual(3);
      }
    }
  });
});
