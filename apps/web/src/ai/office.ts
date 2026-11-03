import { templates, type OfficeParams } from "@workbits/shared";

/**
 * Local, deterministic prompt → office suggestions (ADR-010: language maps to
 * parameters, never to geometry). No API key needed.
 */
export type OfficeSuggestion = { office: OfficeParams; title: string; note: string };

const numberWords: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, sixteen: 16, twenty: 20,
};

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Headcount from "12 people", "twelve", "a team of 6"; defaults to 8. */
export function headcountOf(prompt: string) {
  const text = prompt.toLowerCase();
  const digits = text.match(/\b(\d{1,2})\b/);
  if (digits) return Math.max(1, Math.min(32, Number(digits[1])));
  // The number mentioned first is the team size ("twelve people, two meeting rooms").
  let first: { at: number; value: number } | null = null;
  for (const [key, value] of Object.entries(numberWords)) {
    const at = text.search(new RegExp(`\\b${key}\\b`));
    if (at >= 0 && (!first || at < first.at)) first = { at, value };
  }
  return first?.value ?? 8;
}

/** Three suggestions for a prompt; `round` rerolls the seeds without touching the text. */
export function suggestOffices(prompt: string, round = 0): OfficeSuggestion[] {
  const text = prompt.toLowerCase();
  const headcount = headcountOf(text);
  const off = (word: string) => new RegExp(`\\b(no|without|skip)\\s+(a\\s+|the\\s+)?${word}`).test(text);
  const rooms = { ...(off("nap") ? { nap: false } : {}), ...(off("focus|booth") ? { focus: false } : {}), ...(off("lounge|sofa") ? { lounge: false } : {}) };
  const seed = ((hash(text) + round * 7919) % 9973) + 1;
  // Smallest templates that seat everyone first, then roomier ones.
  const fitting = [...templates].sort((a, b) => {
    const fitsA = a.maxSeats >= headcount ? 0 : 1;
    const fitsB = b.maxSeats >= headcount ? 0 : 1;
    return fitsA - fitsB || a.size.w * a.size.d - b.size.w * b.size.d;
  });
  return fitting.slice(0, 3).map((template, index) => {
    const seats = Math.min(headcount, template.maxSeats);
    return {
      office: { template: template.id, headcount, seed: seed + index, ...(Object.keys(rooms).length ? { rooms } : {}) },
      title: template.name,
      note: `${template.size.w} × ${template.size.d} m · ${seats} desks${seats < headcount ? ` (fits ${template.maxSeats} max)` : ""}`,
    };
  });
}
