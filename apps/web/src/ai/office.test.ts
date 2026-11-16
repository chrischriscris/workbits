import { describe, expect, test } from "bun:test";
import { buildOffice, seatsOf, templates } from "@workbits/shared";
import { headcountOf, suggestOffices } from "./office";

describe("suggestOffices", () => {
  test("returns three deterministic suggestions", () => {
    const first = suggestOffices("collaborative twelve-person team, warm and green");
    expect(first).toHaveLength(3);
    expect(first).toEqual(suggestOffices("collaborative twelve-person team, warm and green"));
  });

  test("rerolling changes seeds, never the headcount", () => {
    const first = suggestOffices("a team of twelve");
    const again = suggestOffices("a team of twelve", 3);
    expect(again.map((s) => s.office.headcount)).toEqual(first.map((s) => s.office.headcount));
    expect(again[0]!.office.seed).not.toBe(first[0]!.office.seed);
  });

  test("reads headcount from digits and words", () => {
    expect(headcountOf("a team of 6")).toBe(6);
    expect(headcountOf("twelve people")).toBe(12);
    expect(headcountOf("cozy studio")).toBe(8);
    expect(headcountOf("a team of twelve, two meeting rooms")).toBe(12);
  });

  test("the first suggestion seats everyone when a template can", () => {
    const [first] = suggestOffices("14 people");
    const template = templates.find((candidate) => candidate.id === first!.office.template)!;
    expect(template.maxSeats).toBeGreaterThanOrEqual(14);
    const pods = buildOffice(first!.office).items.filter((item) => item.key === "DeskPod").length;
    expect(pods * 4).toBeGreaterThanOrEqual(14);
  });

  test("'no nap' switches the nap room off", () => {
    for (const suggestion of suggestOffices("10 people, no nap room")) {
      expect(suggestion.office.rooms?.nap).toBe(false);
      expect(buildOffice(suggestion.office).rooms.some((room) => room.type === "nap")).toBe(false);
      expect(seatsOf(buildOffice(suggestion.office)).length).toBeGreaterThan(0);
    }
  });
});
