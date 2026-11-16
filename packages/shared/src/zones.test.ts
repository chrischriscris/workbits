import { describe, expect, test } from "bun:test";
import { zoneAt, zones } from "./zones";

describe("zoneAt", () => {
  test("every room anchor resolves to its own zone", () => {
    for (const zone of zones) {
      expect(zoneAt(zone.anchor.x, zone.anchor.z)).toBe(zone.id);
    }
  });

  test("the meeting room has a private boundary", () => {
    expect(zoneAt(-4.8, -3.2)).toBe("meeting");
    expect(zoneAt(-2.0, -3.2)).not.toBe("meeting");
    expect(zoneAt(1.0, -3.2)).not.toBe("meeting");
  });

  test("the nap nook is the private front-right corner", () => {
    expect(zoneAt(6.4, 3.05)).toBe("nap");
    expect(zoneAt(6.4, 0.5)).toBe("engineering");
    expect(zoneAt(4.0, 4.5)).toBe("engineering");
  });

  test("defaults to engineering in the open middle", () => {
    expect(zoneAt(0, 0)).toBe("engineering");
  });

  test("every pod seat stays in engineering", () => {
    const seats = [
      [-1.7, -0.9], [0.1, -0.9], [-1.7, 2.0], [0.1, 2.0],
      [1.7, 2.25], [3.5, 2.25], [1.7, 5.15], [3.5, 5.15],
    ];
    for (const [x, z] of seats) expect(zoneAt(x!, z!)).toBe("engineering");
  });
});
