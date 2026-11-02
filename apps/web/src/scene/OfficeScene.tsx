import { MapControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, SSAO, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect } from "react";
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
  const mobile = size.width < 900;
  const spawn = spawnFor(localCharacterId);
  const targetX = mobile ? spawn[0] : -1.4;
  const targetZ = mobile ? Math.max(3, spawn[2] - 2) : 0.6;

  useEffect(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    if (!orthographic.isOrthographicCamera) return;
    const targetWidth = mobile ? 14 : 21;
    orthographic.zoom = size.width / targetWidth;
    orthographic.updateProjectionMatrix();
  }, [camera, mobile, size.width]);

  useEffect(() => {
    if (!controls) return;
    controls.target.set(targetX, 0, targetZ);
    controls.update();
  }, [controls, targetX, targetZ]);
  return (
    <MapControls
      makeDefault
      enableRotate={false}
      enablePan
      enableZoom
      minZoom={18}
      maxZoom={90}
      target={[targetX, 0, targetZ]}
      panSpeed={0.85}
      zoomSpeed={0.85}
    />
  );
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
      camera={{ position: [20, 20, 20], zoom: 68, near: -100, far: 200 }}
      dpr={e2e ? 1 : [1, 2]}
      gl={{ antialias: !e2e, alpha: true, powerPreference: e2e ? "low-power" : "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.94;
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} color="#fff6ea" />
        <hemisphereLight args={["#fff8ec", "#aebfd1", 0.52]} />
        <directionalLight
          castShadow
          position={[12, 18, 8]}
          intensity={1.85}
          color="#fff0d4"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={22}
          shadow-camera-bottom={-22}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-bias={-0.0002}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[-12, 10, -10]} intensity={0.58} color="#dbe8ff" />
        <directionalLight position={[4, 8, 16]} intensity={0.58} color="#fff7e8" />
        <Office />
        <CameraRig />
        {!e2e && (
          <EffectComposer multisampling={0} enableNormalPass>
            <SSAO samples={12} radius={4} intensity={14} luminanceInfluence={0.35} color="#000000" />
            <Bloom
              intensity={0.14}
              luminanceThreshold={0.86}
              luminanceSmoothing={0.3}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.18} darkness={0.45} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
