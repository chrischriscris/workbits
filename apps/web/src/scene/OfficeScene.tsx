import { MapControls, SoftShadows } from "@react-three/drei";
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
  const artMode = new URLSearchParams(window.location.search).has("art");
  const mobile = size.width < 900 && !artMode;
  const spawn = spawnFor(localCharacterId);
  const targetX = mobile ? spawn[0] : 0;
  const targetZ = mobile ? Math.max(3, spawn[2] - 2) : 0;

  useEffect(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    if (!orthographic.isOrthographicCamera) return;
    const targetWidth = artMode ? 27.5 : mobile ? 15 : 28.5;
    orthographic.zoom = size.width / targetWidth;
    orthographic.updateProjectionMatrix();
  }, [artMode, camera, mobile, size.width]);

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
      minZoom={20}
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
      camera={{ position: [20, 16, 20], zoom: 46, near: -100, far: 200 }}
      dpr={e2e ? 1 : [1, 1.75]}
      gl={{ antialias: !e2e, alpha: true, powerPreference: e2e ? "low-power" : "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <Suspense fallback={null}>
        <SoftShadows size={22} samples={10} focus={0.7} />
        <ambientLight intensity={0.2} color="#fff6ea" />
        <hemisphereLight args={["#fff8ec", "#becad2", 0.68]} />
        <directionalLight
          castShadow
          position={[-6, 20, 14]}
          intensity={2.15}
          color="#fff0d2"
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
        <directionalLight position={[10, 8, -8]} intensity={0.32} color="#dbe8ff" />
        <directionalLight position={[4, 8, 16]} intensity={0.42} color="#fff7e8" />
        <Office />
        <CameraRig />
        {!e2e && (
          <EffectComposer multisampling={0} enableNormalPass>
            <SSAO samples={16} radius={4} intensity={14} luminanceInfluence={0.26} color="#1b1b1b" />
            <Bloom
              intensity={0.07}
              luminanceThreshold={0.95}
              luminanceSmoothing={0.3}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.16} darkness={0.25} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
