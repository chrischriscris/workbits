import { describe, expect, test } from "bun:test";
import { FAR_DISTANCE, NEAR_DISTANCE, proximityGain } from "./gain";

describe("proximityGain", () => {
  test("is full volume at or inside the near radius", () => {
    expect(proximityGain(0)).toBe(1);
    expect(proximityGain(NEAR_DISTANCE)).toBe(1);
  });

  test("is silent at or beyond the far radius", () => {
    expect(proximityGain(FAR_DISTANCE)).toBe(0);
    expect(proximityGain(100)).toBe(0);
  });

  test("is linear in between", () => {
    expect(proximityGain((NEAR_DISTANCE + FAR_DISTANCE) / 2)).toBeCloseTo(0.5, 6);
  });

  test("clamps negative distances", () => {
    expect(proximityGain(-3)).toBe(1);
  });
});
