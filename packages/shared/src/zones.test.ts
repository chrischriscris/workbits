import { describe, expect, test } from "bun:test";
import { zoneAt, zones } from "./zones";

describe("zoneAt", () => {
  test("every room anchor resolves to its own zone", () => {
    for (const zone of zones) {
      expect(zoneAt(zone.anchor.x, zone.anchor.z)).toBe(zone.id);
    }
  });

  test("the meeting room has a private boundary", () => {
    expect(zoneAt(7, -4)).toBe("meeting");
    expect(zoneAt(3.2, -4)).not.toBe("meeting");
    expect(zoneAt(11.1, -4)).not.toBe("meeting");
  });

  test("the garden and nap room split the right side", () => {
    expect(zoneAt(9, 4.2)).toBe("nap");
    expect(zoneAt(9, 7.6)).toBe("garden");
  });

  test("defaults to engineering in the open middle", () => {
    expect(zoneAt(0, 0)).toBe("engineering");
  });
});
