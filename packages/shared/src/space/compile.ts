import { footprintOf } from "./catalog";
import type { Item, Point, Room, SpaceDoc } from "./types";

export type CompileOptions = {
  /** Avatar radius used to dilate walls and furniture. The server uses a smaller one for slack. */
  radius?: number;
  /** Grid cell size in metres. */
  cell?: number;
  /** Items that live outside the document today (the desk layout). */
  extraItems?: Item[];
};

export type RoomRef = Pick<Room, "id" | "name" | "type" | "anchor"> & { privacy: Room["privacy"] };

export type CompiledSpace = {
  doc: SpaceDoc;
  radius: number;
  cell: number;
  /** Walkable extent: the floor inset by the avatar radius. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  roomAt(x: number, z: number): RoomRef;
  walkable(x: number, z: number): boolean;
  /** True if a straight walk from a to b stays on walkable ground. */
  segmentClear(a: Point, b: Point): boolean;
  nearestWalkable(p: Point): Point;
  /** Walkable polyline from `from` to the walkable point nearest `to`, or null if unreachable. */
  findPath(from: Point, to: Point): Point[] | null;
};

const WALL_HALF = 0.05;

function distanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** The solid pieces of an edge: its span minus its openings, as [from, to] distances along it. */
function solidSpans(length: number, openings: Array<{ at: number; width: number }>) {
  const sorted = [...openings].sort((a, b) => a.at - b.at);
  const spans: Array<[number, number]> = [];
  let cursor = 0;
  for (const opening of sorted) {
    if (opening.at > cursor) spans.push([cursor, opening.at]);
    cursor = Math.max(cursor, opening.at + opening.width);
  }
  if (cursor < length) spans.push([cursor, length]);
  return spans;
}

export function compileSpace(doc: SpaceDoc, options: CompileOptions = {}): CompiledSpace {
  const radius = options.radius ?? 0.25;
  const cell = options.cell ?? 0.2;
  const { floor } = doc;
  const bounds = {
    minX: floor.x + radius,
    maxX: floor.x + floor.w - radius,
    minZ: floor.z + radius,
    maxZ: floor.z + floor.d - radius,
  };

  // Wall segments with their openings cut out, in world space.
  const walls: Array<[number, number, number, number]> = [];
  for (const edge of doc.edges) {
    const dx = edge.b.x - edge.a.x;
    const dz = edge.b.z - edge.a.z;
    const length = Math.hypot(dx, dz);
    if (length === 0) continue;
    const ux = dx / length;
    const uz = dz / length;
    for (const [from, to] of solidSpans(length, edge.openings)) {
      walls.push([edge.a.x + ux * from, edge.a.z + uz * from, edge.a.x + ux * to, edge.a.z + uz * to]);
    }
  }

  // Furniture footprints, dilated by the radius, tested in each item's local space.
  const solids = [...doc.items, ...(options.extraItems ?? [])].flatMap((item) => {
    const cos = Math.cos(item.rot ?? 0);
    const sin = Math.sin(item.rot ?? 0);
    return footprintOf(item).map((f) => ({ x: item.at.x, z: item.at.z, cos, sin, f }));
  });

  const blockedAt = (x: number, z: number) => {
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return true;
    for (const [ax, az, bx, bz] of walls) {
      if (distanceToSegment(x, z, ax, az, bx, bz) < radius + WALL_HALF) return true;
    }
    for (const { x: ix, z: iz, cos, sin, f } of solids) {
      // World → local: rotate by -rot (three.js Y rotation maps local (x, z) to (x cos + z sin, -x sin + z cos)).
      const wx = x - ix;
      const wz = z - iz;
      const lx = wx * cos - wz * sin;
      const lz = wx * sin + wz * cos;
      if (Math.abs(lx - f.cx) < f.w / 2 + radius && Math.abs(lz - f.cz) < f.d / 2 + radius) return true;
    }
    return false;
  };

  // Rasterize once.
  const cols = Math.ceil(floor.w / cell);
  const rows = Math.ceil(floor.d / cell);
  const blocked = new Uint8Array(cols * rows);
  const cellX = (col: number) => floor.x + (col + 0.5) * cell;
  const cellZ = (row: number) => floor.z + (row + 0.5) * cell;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      blocked[row * cols + col] = blockedAt(cellX(col), cellZ(row)) ? 1 : 0;
    }
  }
  const colOf = (x: number) => Math.floor((x - floor.x) / cell);
  const rowOf = (z: number) => Math.floor((z - floor.z) / cell);
  const open = (col: number, row: number) => col >= 0 && row >= 0 && col < cols && row < rows && blocked[row * cols + col] === 0;

  const walkable = (x: number, z: number) => open(colOf(x), rowOf(z)) && !blockedAt(x, z);

  const segmentClear = (a: Point, b: Point) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(length / (cell / 2)));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      if (blockedAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  };

  const nearestCell = (p: Point): [number, number] | null => {
    const startCol = Math.max(0, Math.min(cols - 1, colOf(p.x)));
    const startRow = Math.max(0, Math.min(rows - 1, rowOf(p.z)));
    if (open(startCol, startRow)) return [startCol, startRow];
    for (let ring = 1; ring < Math.max(cols, rows); ring += 1) {
      let best: [number, number] | null = null;
      let bestDistance = Infinity;
      for (let dr = -ring; dr <= ring; dr += 1) {
        for (let dc = -ring; dc <= ring; dc += 1) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
          const col = startCol + dc;
          const row = startRow + dr;
          if (!open(col, row)) continue;
          const distance = Math.hypot(cellX(col) - p.x, cellZ(row) - p.z);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = [col, row];
          }
        }
      }
      if (best) return best;
    }
    return null;
  };

  const nearestWalkable = (p: Point): Point => {
    if (walkable(p.x, p.z)) return p;
    const found = nearestCell(p);
    return found ? { x: cellX(found[0]), z: cellZ(found[1]) } : { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
  };

  const findPath = (from: Point, to: Point): Point[] | null => {
    const start = nearestCell(from);
    const goal = nearestCell(to);
    if (!start || !goal) return null;
    const startIndex = start[1] * cols + start[0];
    const goalIndex = goal[1] * cols + goal[0];
    const g = new Float32Array(cols * rows).fill(Infinity);
    const came = new Int32Array(cols * rows).fill(-1);
    const closed = new Uint8Array(cols * rows);
    const heap: Array<[number, number]> = [];
    const push = (index: number, f: number) => {
      heap.push([f, index]);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent]![0] <= heap[i]![0]) break;
        [heap[parent], heap[i]] = [heap[i]!, heap[parent]!];
        i = parent;
      }
    };
    const pop = () => {
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const left = i * 2 + 1;
          const right = left + 1;
          let smallest = i;
          if (left < heap.length && heap[left]![0] < heap[smallest]![0]) smallest = left;
          if (right < heap.length && heap[right]![0] < heap[smallest]![0]) smallest = right;
          if (smallest === i) break;
          [heap[smallest], heap[i]] = [heap[i]!, heap[smallest]!];
          i = smallest;
        }
      }
      return top[1];
    };
    const heuristic = (index: number) => {
      const dc = Math.abs((index % cols) - goal[0]);
      const dr = Math.abs(Math.floor(index / cols) - goal[1]);
      return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
    };
    g[startIndex] = 0;
    push(startIndex, heuristic(startIndex));
    while (heap.length > 0) {
      const index = pop();
      if (index === goalIndex) break;
      if (closed[index]) continue;
      closed[index] = 1;
      const col = index % cols;
      const row = Math.floor(index / cols);
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const nc = col + dc;
          const nr = row + dr;
          if (!open(nc, nr)) continue;
          // No cutting corners past a blocked cell.
          if (dr !== 0 && dc !== 0 && (!open(col + dc, row) || !open(col, row + dr))) continue;
          const next = nr * cols + nc;
          const cost = g[index]! + (dr !== 0 && dc !== 0 ? Math.SQRT2 : 1);
          if (cost < g[next]!) {
            g[next] = cost;
            came[next] = index;
            push(next, cost + heuristic(next));
          }
        }
      }
    }
    if (startIndex !== goalIndex && came[goalIndex] === -1) return null;

    const cells: Point[] = [];
    for (let index = goalIndex; index !== -1; index = index === startIndex ? -1 : came[index]!) {
      cells.push({ x: cellX(index % cols), z: cellZ(Math.floor(index / cols)) });
    }
    cells.reverse();
    // Use the exact goal when it's walkable, then pull the string tight.
    const end = walkable(to.x, to.z) ? to : cells[cells.length - 1]!;
    const raw = [walkable(from.x, from.z) ? from : cells[0]!, ...cells.slice(1, -1), end];
    const path: Point[] = [raw[0]!];
    let anchor = 0;
    for (let i = 2; i < raw.length; i += 1) {
      if (!segmentClear(raw[anchor]!, raw[i]!)) {
        anchor = i - 1;
        path.push(raw[anchor]!);
      }
    }
    if (raw.length > 1) path.push(raw[raw.length - 1]!);
    return path;
  };

  const floorRoom: RoomRef = { ...doc.floorRoom, privacy: "open" };
  const roomAt = (x: number, z: number): RoomRef => {
    for (const room of doc.rooms) {
      const { rect } = room;
      if (x >= rect.x && x < rect.x + rect.w && z >= rect.z && z < rect.z + rect.d) return room;
    }
    return floorRoom;
  };

  return { doc, radius, cell, bounds, roomAt, walkable, segmentClear, nearestWalkable, findPath };
}
