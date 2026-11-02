import { ContactShadows, MapControls, SoftShadows } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, SSAO, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect } from "react";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";
import { localCharacterId } from "../data/team";
import { spawnFor } from "../data/spawns";
import { Office } from "./Office";

function CameraRig() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null;
  const params = new URLSearchParams(window.location.search);
  const artMode = params.has("art");
  // Framing knobs for art experiments: ?art&artWidth=19.5&artTarget=0,0.6,-0.3
  const artWidth = Number(params.get("artWidth") ?? 19.5);
  const artTarget = (params.get("artTarget") ?? "0,0.6,-0.3").split(",").map(Number);
  const mobile = size.width < 900 && !artMode;
  const spawn = spawnFor(localCharacterId);
  const targetX = mobile ? spawn[0] : artMode ? artTarget[0]! : 0;
  const targetY = artMode ? artTarget[1]! : 0;
  const targetZ = mobile ? Math.max(3, spawn[2] - 2) : artMode ? artTarget[2]! : 0;

  useEffect(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    if (!orthographic.isOrthographicCamera) return;
    // The compact 15 x 11 room fills the frame, like the reference.
    const targetWidth = artMode ? artWidth : mobile ? 15 : 19.5;
    orthographic.zoom = size.width / targetWidth;
    orthographic.updateProjectionMatrix();
  }, [artMode, artWidth, camera, mobile, size.width]);

  useEffect(() => {
    if (!controls) return;
    controls.target.set(targetX, targetY, targetZ);
    controls.update();
  }, [controls, targetX, targetY, targetZ]);
  return (
    <MapControls
      makeDefault
      enableRotate={false}
      enablePan
      enableZoom
      minZoom={20}
      maxZoom={90}
      target={[targetX, targetY, targetZ]}
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
      dpr={e2e ? 1 : [1, 1.75]}
      gl={{ antialias: !e2e, alpha: true, powerPreference: e2e ? "low-power" : "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.16;
      }}
    >
      <Suspense fallback={null}>
        <SoftShadows size={26} samples={8} focus={0.7} />
        <SoftEnvironment intensity={0.25} />
        <hemisphereLight args={["#ffeedd", "#f0d8bf", 0.2]} />
        {/* Warm, lower afternoon sun from the window side: longer soft shadows. */}
        <directionalLight
          castShadow
          position={[-12, 13, 7]}
          intensity={3.3}
          color="#ffd6a3"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-17}
          shadow-camera-right={17}
          shadow-camera-top={17}
          shadow-camera-bottom={-17}
          shadow-camera-near={0.1}
          shadow-camera-far={60}
          shadow-bias={-0.00015}
          shadow-normalBias={0.03}
        />
        <directionalLight position={[10, 8, -8]} intensity={0.18} color="#dbe8ff" />
        <directionalLight position={[4, 8, 16]} intensity={0.3} color="#fff7e8" />
        <Office />
        <DevExport />
        <ContactShadows
          position={[0, 0.055, 0]}
          opacity={0.36}
          scale={34}
          blur={2.4}
          far={4.5}
          resolution={1024}
          color="#6b5844"
        />
        <CameraRig />
        {!e2e && (
          <EffectComposer multisampling={0} enableNormalPass>
            <SSAO samples={16} radius={5} intensity={10} luminanceInfluence={0.22} color="#1b1b1b" />
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
