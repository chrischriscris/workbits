import { describe, expect, test } from "bun:test";
import { characterSpawns, compileSpace, defaultLoft, seatsOf, BENCH_DESKS } from ".";

const loft = compileSpace(defaultLoft);

describe("default loft", () => {
  test("every room anchor and doc spawn is walkable", () => {
    for (const room of [...defaultLoft.rooms, defaultLoft.floorRoom]) {
      expect({ room: room.id, ok: loft.walkable(room.anchor.x, room.anchor.z) }).toEqual({ room: room.id, ok: true });
    }
    for (const spawn of defaultLoft.spawns) expect(loft.walkable(spawn.x, spawn.z)).toBe(true);
  });

  test("every anchor is reachable from every other", () => {
    const anchors = [...defaultLoft.rooms, defaultLoft.floorRoom].map((room) => room.anchor);
    for (const from of anchors) {
      for (const to of anchors) {
        const path = loft.findPath(from, to);
        expect(path).not.toBeNull();
        for (let i = 1; i < path!.length; i += 1) expect(loft.segmentClear(path![i - 1]!, path![i]!)).toBe(true);
      }
    }
  });

  test("the meeting room glass blocks a straight walk; the path goes through the door", () => {
    // The straight line crosses the front glass at x ≈ −4.3, well west of the door.
    const outside = { x: -3.08, z: -0.3 };
    const inside = { x: -5.5, z: -1.45 };
    expect(loft.walkable(outside.x, outside.z)).toBe(true);
    expect(loft.walkable(inside.x, inside.z)).toBe(true);
    expect(loft.segmentClear(outside, inside)).toBe(false);
    const path = loft.findPath(outside, inside)!;
    expect(path.length).toBeGreaterThan(2);
    // It passes the front glass inside the door gap (x −3.6 … −2.7).
    const crossing = path.find((point, i) => i > 0 && (path[i - 1]!.z - -0.9) * (point.z - -0.9) <= 0);
    expect(crossing).toBeDefined();
  });

  test("furniture blocks: the meeting table, the kitchen counter and the desks", () => {
    expect(loft.walkable(-4.8, -3.25)).toBe(false);
    expect(loft.walkable(1.45, -5.13)).toBe(false);
    expect(loft.walkable(BENCH_DESKS[0]!.x, BENCH_DESKS[0]!.z)).toBe(false);
  });

  test("character spawns resolve to walkable spots nearby", () => {
    for (const [id, spawn] of Object.entries(characterSpawns)) {
      const resolved = loft.nearestWalkable(spawn);
      expect({ id, ok: loft.walkable(resolved.x, resolved.z) }).toEqual({ id, ok: true });
      expect(Math.hypot(resolved.x - spawn.x, resolved.z - spawn.z)).toBeLessThan(1.6);
    }
  });

  test("an unreachable target snaps to the nearest walkable cell", () => {
    const path = loft.findPath({ x: 0.9, z: 3.2 }, { x: -4.8, z: -3.25 });
    expect(path).not.toBeNull();
    const end = path![path!.length - 1]!;
    expect(loft.walkable(end.x, end.z)).toBe(true);
    expect(loft.roomAt(end.x, end.z).id).toBe("meeting");
  });
});

describe("seats", () => {
  test("the loft's pods give the bench layout's eight chairs, in the same order", () => {
    const seats = seatsOf(defaultLoft);
    expect(seats.length).toBe(BENCH_DESKS.length);
    BENCH_DESKS.forEach((desk, index) => {
      const z = desk.z + (desk.rotation === 0 ? 0.95 : -0.95);
      expect(seats[index]!.x).toBeCloseTo(desk.x, 5);
      expect(seats[index]!.z).toBeCloseTo(z, 5);
    });
  });

  test("every chair is walkable, so people can reach their seat", () => {
    for (const seat of seatsOf(defaultLoft)) expect(loft.walkable(seat.x, seat.z)).toBe(true);
  });
});
