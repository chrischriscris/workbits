import { ContactShadows, MapControls, SoftShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, SSAO, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo } from "react";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";
import { useRealtimeStore } from "../realtime/store";
import { useSpace } from "../state/space";
import { Office } from "./Office";

const tmpRight = new THREE.Vector3();
const tmpUp = new THREE.Vector3();
const tmpPoint = new THREE.Vector3();
const tmpDesired = new THREE.Vector3();

/**
 * Fixed human-scale zoom (ADR-015). An office that fits on screen keeps the
 * hand-tuned framing; a bigger one follows the player, clamped so the view
 * never runs past the office's edges. Users can still pan and zoom.
 */
function CameraRig() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null;
  const doc = useSpace((state) => state.doc);
  const params = new URLSearchParams(window.location.search);
  const artMode = params.has("art");
  // Framing knobs for art experiments: ?art&artWidth=19.5&artTarget=0,0.6,-0.3
  const artWidth = Number(params.get("artWidth") ?? 19.5);
  const artTarget = (params.get("artTarget") ?? "0,0.6,-0.3").split(",").map(Number);
  const mobile = size.width < 900 && !artMode;
  const viewWidth = artMode ? artWidth : mobile ? 15 : 19.5;
  const { floor } = doc;
  // The app's tuned target for the loft was the origin; keep it relative to the floor centre.
  const fitTarget = useMemo(
    () => new THREE.Vector3(floor.x + floor.w / 2 - 0.12, 0, floor.z + floor.d / 2 - 0.145),
    [floor],
  );
  const initial = artMode ? new THREE.Vector3(artTarget[0], artTarget[1], artTarget[2]) : fitTarget;

  useEffect(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    if (!orthographic.isOrthographicCamera) return;
    orthographic.zoom = size.width / viewWidth;
    orthographic.updateProjectionMatrix();
  }, [camera, size.width, viewWidth]);

  useEffect(() => {
    if (!controls) return;
    // Aim only (the camera stays at its fixed spot), exactly as the tuned framing was built.
    controls.target.copy(initial);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, initial.x, initial.y, initial.z]);

  useFrame((_, delta) => {
    if (!controls || artMode) return;
    const zoom = (camera as THREE.OrthographicCamera).zoom;
    const halfW = size.width / zoom / 2;
    const halfH = size.height / zoom / 2;
    tmpRight.setFromMatrixColumn(camera.matrixWorld, 0);
    tmpUp.setFromMatrixColumn(camera.matrixWorld, 1);
    // Screen-space extent of the floor and the wall tops.
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y, z] of [
      [floor.x, 0, floor.z],
      [floor.x + floor.w, 0, floor.z],
      [floor.x, 0, floor.z + floor.d],
      [floor.x + floor.w, 0, floor.z + floor.d],
      [floor.x, doc.wallHeight, floor.z],
    ] as const) {
      tmpPoint.set(x, y, z);
      const sx = tmpPoint.dot(tmpRight);
      const sy = tmpPoint.dot(tmpUp);
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }
    // A little overflow is part of the tuned framing (the loft spills ~10% at 1440 × 900).
    const fitsX = maxX - minX <= halfW * 2 * 1.15;
    const fitsY = maxY - minY <= halfH * 2 * 1.15;
    if (fitsX && fitsY) return; // The tuned framing holds; leave panning to the user.
    const player = useRealtimeStore.getState().localPosition;
    tmpPoint.set(player.x, 0, player.z);
    const px = tmpPoint.dot(tmpRight);
    const py = tmpPoint.dot(tmpUp);
    const fit = fitTarget;
    const sx = fitsX ? fit.dot(tmpRight) : THREE.MathUtils.clamp(px, minX + halfW, maxX - halfW);
    const sy = fitsY ? fit.dot(tmpUp) : THREE.MathUtils.clamp(py, minY + halfH, maxY - halfH);
    // Back to a ground-level target on the camera's view line through (sx, sy).
    const forward = tmpPoint.setFromMatrixColumn(camera.matrixWorld, 2).negate();
    const along = (fit.y - sx * tmpRight.y - sy * tmpUp.y) / forward.y;
    tmpDesired.copy(tmpRight).multiplyScalar(sx).addScaledVector(tmpUp, sy).addScaledVector(forward, along);
    const step = tmpDesired.sub(controls.target).multiplyScalar(Math.min(1, delta * 4));
    controls.target.add(step);
    camera.position.add(step);
    controls.update();
  });

  return (
    <MapControls
      makeDefault
      enableRotate={false}
      enablePan
      enableZoom
      minZoom={20}
      maxZoom={90}
      panSpeed={0.85}
      zoomSpeed={0.85}
    />
  );
}

/**
 * Soft image-based light from three's procedural studio room, generated
 * locally (no HDR download). It gives every surface the gentle wrap-around
 * fill and soft highlights the plush reference renders have.
 */
function SoftEnvironment({ intensity = 0.5 }: { intensity?: number }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      target.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

/** Dev-only hook for offline renders: window.__WORKBITS_EXPORT__() -> base64 GLB. */
function DevExport() {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const target = window as unknown as { __WORKBITS_EXPORT__?: () => Promise<string> };
    target.__WORKBITS_EXPORT__ = async () => (await import("./devExport")).exportSceneGlb(scene);
    return () => {
      delete target.__WORKBITS_EXPORT__;
    };
  }, [scene]);
  return null;
}

export function OfficeScene() {
  const e2e = new URLSearchParams(window.location.search).has("e2e");
  const floor = useSpace((state) => state.doc.floor);
  // Lights and shadows sit relative to the floor; the loft's floor gives the old origin exactly.
  const center = { x: floor.x + floor.w / 2 - 0.12, z: floor.z + floor.d / 2 - 0.145 };
  // ±17 for the 15 × 11 loft.
  const shadowHalf = Math.max(floor.w, floor.d) * 0.75 + 5.6;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.__WORKBITS_READY__ = true;
    }, e2e ? 350 : 600);
    return () => window.clearTimeout(timer);
  }, [e2e]);

  return (
    <Canvas
      shadows={!e2e}
      orthographic
      camera={{ position: [20, 15, 20], zoom: 46, near: -100, far: 200 }}
      // e2e checks run in SwiftShader (CPU); half-resolution 3D keeps them fast.
      // The HTML UI on top stays sharp, and art checks use art-view, not e2e.
      dpr={e2e ? 0.5 : [1, 1.75]}
      gl={{ antialias: !e2e, alpha: true, powerPreference: e2e ? "low-power" : "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
    >
      <Suspense fallback={null}>
        {!e2e && <SoftShadows size={26} samples={8} focus={0.7} />}
        <SoftEnvironment intensity={0.4} />
        <hemisphereLight args={["#fff4e6", "#f3e2cc", 0.32]} />
        {/* Warm, lower afternoon sun from the window side: longer soft shadows. */}
        <directionalLight
          castShadow
          position={[center.x - 12, 13, center.z + 7]}
          intensity={2.8}
          color="#ffd6a3"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-shadowHalf}
          shadow-camera-right={shadowHalf}
          shadow-camera-top={shadowHalf}
          shadow-camera-bottom={-shadowHalf}
          shadow-camera-near={0.1}
          shadow-camera-far={60}
          shadow-bias={-0.00015}
          shadow-normalBias={0.03}
        />
        <directionalLight position={[10, 8, -8]} intensity={0.18} color="#dbe8ff" />
        <directionalLight position={[4, 8, 16]} intensity={0.3} color="#fff7e8" />
        <Office />
        <DevExport />
        {/* Re-renders the scene from below every frame: skipped in e2e checks. */}
        {!e2e && (
          <ContactShadows
            position={[center.x, 0.055, center.z]}
            opacity={0.36}
            scale={Math.max(floor.w, floor.d) * 2.25}
            blur={2.4}
            far={4.5}
            resolution={1024}
            color="#6b5844"
          />
        )}
        <CameraRig />
        {!e2e && (
          <EffectComposer multisampling={0} enableNormalPass>
            <SSAO samples={16} radius={5} intensity={5} luminanceInfluence={0.22} color="#1b1b1b" />
            <HueSaturation saturation={0.12} />
            <BrightnessContrast brightness={0} contrast={0.11} />
            <Bloom
              intensity={0.06}
              luminanceThreshold={0.98}
              luminanceSmoothing={0.35}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.16} darkness={0.18} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
