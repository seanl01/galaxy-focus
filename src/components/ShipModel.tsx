"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SHIP_MAP } from "@/lib/data";

interface ShipModelProps {
  shipId: string;
  /** Canvas width in px; height is width * 0.62. */
  size?: number;
  className?: string;
  /** Freeze the turntable (static thumbnails). */
  spin?: boolean;
}

// One GLTF load per model path, shared across all component instances
// (including the full-screen ChaseView).
const gltfCache = new Map<string, Promise<GLTF>>();

export function loadShipModel(path: string): Promise<GLTF> {
  let p = gltfCache.get(path);
  if (!p) {
    p = new GLTFLoader().loadAsync(path);
    gltfCache.set(path, p);
  }
  return p;
}

/**
 * Renders a ship GLB in a studio turntable pose on a transparent three.js
 * canvas — image-based environment lighting plus a warm key and cool rim.
 * Models are CC-BY assets; see the credits in Settings and the README.
 */
export default function ShipModel({
  shipId,
  size = 160,
  className = "",
  spin = true,
}: ShipModelProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const ship = SHIP_MAP[shipId];
    if (!ship) return;

    const width = size;
    const height = Math.round(size * 0.62);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);

    // Image-based lighting gives the PBR materials something to reflect —
    // this is most of the "aesthetic" difference over plain lights.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.55;

    // Studio: warm key, cool rim, gentle sky gradient.
    const key = new THREE.DirectionalLight(0xffe8c8, 1.7);
    key.position.set(2.5, 3, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7db4ff, 2.0);
    rim.position.set(-3, 1.5, -3.5);
    scene.add(rim);
    const kick = new THREE.DirectionalLight(0x8fe3ff, 0.45);
    kick.position.set(0.5, -2.5, 1.5);
    scene.add(kick);
    scene.add(new THREE.HemisphereLight(0x9db4dd, 0x141008, 0.45));

    const pivot = new THREE.Group();
    scene.add(pivot);

    let disposed = false;
    let raf = 0;

    const reduceMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion");

    loadShipModel(ship.model).then((gltf) => {
      if (disposed) return;
      const object = gltf.scene.clone(true);

      // Centre on origin and normalise scale from the bounding sphere.
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      object.position.sub(center);
      object.scale.setScalar(1 / (sphere.radius || 1));

      const inner = new THREE.Group();
      inner.add(object);
      pivot.add(inner);

      inner.rotation.y = ship.modelYaw;
      camera.position.set(0, 0.55, 2.6 * ship.modelZoom);
      camera.lookAt(0, 0, 0);

      const t0 = performance.now();
      const render = (now: number) => {
        if (disposed) return;
        const t = (now - t0) / 1000;
        if (spin && !reduceMotion) {
          pivot.rotation.y = t * 0.35;
        }
        renderer.render(scene, camera);
        if (spin && !reduceMotion) {
          raf = requestAnimationFrame(render);
        }
      };
      raf = requestAnimationFrame(render);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [shipId, size, spin]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: size, height: Math.round(size * 0.62) }}
      role="img"
      aria-label={SHIP_MAP[shipId]?.name ?? "Ship"}
    />
  );
}
