import { describe, expect, test } from "bun:test";
import { buildOffice, compileSpace, footprintOf, seatsOf, templates, type OfficeParams } from ".";

const cases: OfficeParams[] = templates.flatMap((template) => [
  { template: template.id, headcount: 4, seed: 7 },
  { template: template.id, headcount: template.maxSeats, seed: 3 },
  { template: template.id, headcount: template.maxSeats, seed: 11, rooms: { nap: false, focus: false, lounge: false } },
]);

describe("office templates", () => {
  for (const params of cases) {
    const label = `${params.template} · ${params.headcount} seats${params.rooms ? " · optional rooms off" : ""}`;
    test(label, () => {
      const doc = buildOffice(params);
      const space = compileSpace(doc);
      const start = doc.spawns[0]!;
      expect(space.walkable(start.x, start.z)).toBe(true);

      for (const room of doc.rooms) {
        expect({ room: room.id, walkable: space.walkable(room.anchor.x, room.anchor.z) }).toEqual({ room: room.id, walkable: true });
        expect({ room: room.id, inside: space.roomAt(room.anchor.x, room.anchor.z).id }).toEqual({ room: room.id, inside: room.id });
        expect({ room: room.id, reachable: space.findPath(start, room.anchor) !== null }).toEqual({ room: room.id, reachable: true });
      }
      for (const spawn of doc.spawns) expect(space.findPath(start, spawn)).not.toBeNull();

      const seats = seatsOf(doc);
      expect(seats.length).toBeGreaterThan(0);
      seats.forEach((seat, index) => {
        expect({ seat: index, walkable: space.walkable(seat.x, seat.z) }).toEqual({ seat: index, walkable: true });
        expect({ seat: index, reachable: space.findPath(start, seat) !== null }).toEqual({ seat: index, reachable: true });
      });

      const { floor } = doc;
      for (const item of doc.items) {
        if (footprintOf(item).length === 0) continue;
        const inside = item.at.x > floor.x && item.at.x < floor.x + floor.w && item.at.z > floor.z && item.at.z < floor.z + floor.d;
        expect({ item: item.id, inside }).toEqual({ item: item.id, inside: true });
      }
    });
  }

  test("building is deterministic", () => {
    const params: OfficeParams = { template: "atelier", headcount: 12, seed: 42 };
    expect(JSON.stringify(buildOffice(params))).toBe(JSON.stringify(buildOffice(params)));
  });

  test("headcount is capped by the desk area", () => {
    for (const template of templates) {
      const doc = buildOffice({ template: template.id, headcount: 999 });
      const podSeats = doc.items.filter((item) => item.key === "DeskPod").length * 4;
      expect(podSeats).toBeLessThanOrEqual(Math.ceil(template.maxSeats / 4) * 4);
    }
  });
});
