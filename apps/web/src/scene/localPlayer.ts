/**
 * The local avatar's live position, written every frame by LocalPlayer and
 * read by the camera. The realtime store only gets it every ~70 ms, which made
 * the camera follow in steps.
 */
export const localPlayer = { x: 0, z: 0, moving: false };

if (import.meta.env.DEV && typeof window !== "undefined") {
  // Read by scripts/controls-check.mjs.
  (window as unknown as { __WORKBITS_LOCAL__: typeof localPlayer }).__WORKBITS_LOCAL__ = localPlayer;
}
