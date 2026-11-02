import type { DeskPlacement, OfficeLayout } from "../state/officeLayout";

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function desk(
  id: string,
  x: number,
  z: number,
  rotation = 0,
  variant = 0,
): DeskPlacement {
  return { id, x, z, rotation, variant };
}

function twoRows(count: number): DeskPlacement[] {
  if (count >= 6) {
    return [
      desk("a1", -2.4, 1.55, 0, 0),
      desk("a2", 0, 1.55, 0, 1),
      desk("a3", 2.4, 1.55, 0, 2),
      desk("b1", -2.4, 4.8, Math.PI, 3),
      desk("b2", 0, 4.8, Math.PI, 0),
      desk("b3", 2.4, 4.8, Math.PI, 1),
    ];
  }
  return [
    desk("a1", -1.45, 1.55, 0, 0),
    desk("a2", 1.55, 1.55, 0, 1),
    desk("b1", -1.45, 4.8, Math.PI, 2),
    desk("b2", 1.55, 4.8, Math.PI, 3),
  ];
}

function focusLine(): DeskPlacement[] {
  return [
    desk("f1", -2.7, 3.9, 0, 0),
    desk("f2", -0.9, 3.9, 0, 1),
    desk("f3", 0.9, 3.9, 0, 2),
    desk("f4", 2.7, 3.9, 0, 3),
  ];
}

export function generateOfficeLayouts(prompt: string): OfficeLayout[] {
  const normalized = prompt.toLowerCase();
  const wantsSix = /6|six|six-person|larger/.test(normalized);
  const rug = normalized.includes("sage") || normalized.includes("green")
    ? "sage"
    : normalized.includes("warm") || normalized.includes("terra")
      ? "terracotta"
      : "cream";
  const seed = hash(normalized || "workbits");
  void seed;

  return [
    {
      id: "rows",
      name: "Studio rows",
      note: `${wantsSix ? 6 : 4} desks · paired rows · ${rug} rug`,
      rug,
      desks: twoRows(wantsSix ? 6 : 4),
    },
    {
      id: "focus",
      name: "Focus line",
      note: `4 desks · one long bench · ${rug} rug`,
      rug,
      desks: focusLine(),
    },
    {
      id: "cluster",
      name: "Team cluster",
      note: `6 desks · shared pod · ${rug === "cream" ? "sage" : "cream"} rug`,
      rug: rug === "cream" ? "sage" : "cream",
      desks: twoRows(6).map((item, index) => ({
        ...item,
        variant: (item.variant + 2 + index) % 4,
      })),
    },
  ];
}
