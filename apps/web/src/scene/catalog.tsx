import type { ComponentType } from "react";
import { CHAIR_OFFSET, podDesks, type Edge, type Item, type SpaceDoc } from "@workbits/shared";
import {
  Beanbag,
  Books,
  Cat,
  CoffeeTable,
  Credenza,
  Daybed,
  Desk,
  DeskPartition,
  FloorLamp,
  Fridge,
  GlassWall,
  KitchenRun,
  MeetingTable,
  OfficeChair,
  Pendant,
  Plant,
  Planter,
  Pouf,
  Rug,
  Sectional,
  Shelf,
  SideTable,
  SlatDivider,
  TableLamp,
  TallCabinet,
  Tree,
  Vase,
  WallArt,
  WallClock,
} from "./props";

/**
 * Catalog renderers: an item's key picks a props.tsx component; its position,
 * rotation and scale come from the document, everything else from `params`.
 * Footprints for collision live with the data in packages/shared.
 */
const chairColors = [
  { color: "#56627a", accent: "#f2efe9" },
  { color: "#5e6a80", accent: "#f2efe9" },
  { color: "#525d73", accent: "#ebe6dd" },
  { color: "#5a667c", accent: "#f2efe9" },
];

type V3 = [number, number, number];

/** One desk with its chair in front (local +z is the sitter's side). */
function DeskWithChair({
  position,
  rotation,
  variant = 0,
  width,
  depth,
  panel = true,
}: { position: V3; rotation: V3; variant?: number; width?: number; depth?: number; panel?: boolean }) {
  const colors = chairColors[variant % chairColors.length]!;
  return (
    <group position={position} rotation={rotation}>
      <Desk variant={variant} panel={panel} width={width} depth={depth} />
      <OfficeChair position={[0, 0, CHAIR_OFFSET]} rotation={[0, Math.PI, 0]} color={colors.color} accent={colors.accent} />
    </group>
  );
}

/** A 2 × 2 bench: four desks and chairs around a planted partition. */
function DeskPod({ position, rotation, deskWidth = 1.8, deskDepth = 1.0 }: { position: V3; rotation: V3; deskWidth?: number; deskDepth?: number }) {
  return (
    <group position={position} rotation={rotation}>
      <DeskPartition length={deskWidth * 2} depth={deskDepth} />
      {podDesks(deskWidth, deskDepth).map((desk) => (
        <DeskWithChair
          key={desk.variant}
          position={[desk.x, 0, desk.z]}
          rotation={[0, desk.rotation, 0]}
          variant={desk.variant}
          width={deskWidth}
          depth={deskDepth}
          panel={false}
        />
      ))}
    </group>
  );
}

// Components take differing prop shapes; the document's params are their props.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderers: Record<string, ComponentType<any>> = {
  Beanbag,
  Books,
  Cat,
  CoffeeTable,
  Credenza,
  Daybed,
  Desk: DeskWithChair,
  DeskPod,
  FloorLamp,
  Fridge,
  KitchenRun,
  MeetingTable,
  Pendant,
  Plant,
  Planter,
  Pouf,
  Rug,
  Sectional,
  Shelf,
  SideTable,
  SlatDivider,
  TableLamp,
  TallCabinet,
  Tree,
  Vase,
  WallArt,
  WallClock,
};

function CatalogItem({ item }: { item: Item }) {
  const Component = renderers[item.key];
  if (!Component) {
    if (import.meta.env.DEV) console.warn(`No renderer for catalog key "${item.key}"`);
    return null;
  }
  return (
    <Component
      {...item.params}
      position={[item.at.x, item.at.y ?? 0, item.at.z]}
      rotation={[0, item.rot ?? 0, 0]}
      {...(item.scale !== undefined ? { scale: item.scale } : {})}
    />
  );
}

/** Glass partitions: one pane per solid span, plus a transom over full-height door gaps. */
function EdgeGlass({ edge }: { edge: Edge }) {
  const dx = edge.b.x - edge.a.x;
  const dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz);
  if (length === 0 || (edge.kind !== "glass" && edge.kind !== "frosted")) return null;
  const ux = dx / length;
  const uz = dz / length;
  // GlassWall runs along local x; turn it to the edge's direction.
  const rotation: [number, number, number] = [0, -Math.atan2(uz, ux), 0];
  const at = (distance: number): [number, number] => [edge.a.x + ux * distance, edge.a.z + uz * distance];
  const openings = [...edge.openings].sort((a, b) => a.at - b.at);
  const spans: Array<[number, number]> = [];
  let cursor = 0;
  for (const opening of openings) {
    if (opening.at > cursor) spans.push([cursor, opening.at]);
    cursor = Math.max(cursor, opening.at + opening.width);
  }
  if (cursor < length) spans.push([cursor, length]);
  const transom = edge.height > 2.3 ? 2.2 : null;
  return (
    <group>
      {spans.map(([from, to]) => {
        const [x, z] = at((from + to) / 2);
        return (
          <GlassWall key={from} position={[x, 0, z]} rotation={rotation} length={to - from} height={edge.height} frosted={edge.kind === "frosted"} />
        );
      })}
      {transom !== null &&
        openings.map((opening) => {
          const [x, z] = at(opening.at + opening.width / 2);
          return (
            <GlassWall key={`t${opening.at}`} position={[x, transom, z]} rotation={rotation} length={opening.width} height={edge.height - transom} />
          );
        })}
    </group>
  );
}

/** Everything a document places: partitions and items. The shell renders separately. */
export function SpaceContents({ doc }: { doc: SpaceDoc }) {
  return (
    <group>
      {doc.edges.map((edge) => (
        <EdgeGlass key={edge.id} edge={edge} />
      ))}
      {doc.items.map((item) => (
        <CatalogItem key={item.id} item={item} />
      ))}
    </group>
  );
}
