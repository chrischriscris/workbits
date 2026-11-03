import { useMemo } from "react";
import { create } from "zustand";
import { applyDeskLayout, defaultLoft, type SpaceDoc } from "@workbits/shared";
import { useOfficeLayout } from "./officeLayout";

/** The office document the scene renders and walks on (ADR-015). */
type SpaceState = {
  doc: SpaceDoc;
  setDoc: (doc: SpaceDoc) => void;
};

export const useSpace = create<SpaceState>((set) => ({
  doc: defaultLoft,
  setDoc: (doc) => set({ doc }),
}));

/**
 * The visible shell around a document's walkable floor: wall centre lines,
 * the open ends of the cut walls, and the slab. Offsets reproduce the
 * hand-built loft exactly (walls 0.09 behind the floor edge, open sides a
 * little short of it).
 */
export function shellOf(doc: SpaceDoc) {
  const { floor } = doc;
  const westX = floor.x - 0.09;
  const northZ = floor.z - 0.09;
  const eastX = floor.x + floor.w - 0.2;
  const southZ = floor.z + floor.d - 0.25;
  return {
    westX,
    northZ,
    eastX,
    southZ,
    height: doc.wallHeight,
    slab: {
      width: eastX - westX + 0.5,
      depth: southZ - northZ + 0.55,
      cx: (westX + eastX) / 2,
      cz: (northZ + southZ) / 2,
    },
  };
}

/** The document as rendered and walked: the office plus any custom desk layout (Workspace Studio). */
export function useOfficeDoc() {
  const doc = useSpace((state) => state.doc);
  const layout = useOfficeLayout((state) => state.layout);
  return useMemo(() => applyDeskLayout(doc, layout), [doc, layout]);
}
