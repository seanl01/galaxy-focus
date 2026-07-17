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
  /**
   * turntable — studio pose, slow rotation (thumbnails, hangar).
   * chase — camera high behind the ship, nose into the screen, backlit blue
   *         by the hyperspace tunnel ahead (in-flight exterior view).
   */
  view?: "turntable" | "chase";
  /** Freeze the turntable (static thumbnails). */
  spin?: boolean;
}

// One GLTF load per model path, shared across all component instances.
const gltfCache = new Map<string, Promise<GLTF>>();

function loadModel(path: string): Promise<GLTF> {
  let p = gltfCache.get(path);
  if (!p) {
    p = new GLTFLoader().loadAsync(path);
    gltfCache.set(path, p);
  }
  return p;
}

/**
 * Renders a ship GLB on a transparent three.js canvas — image-based
 * environment lighting plus a warm key and cool rim. Models are CC-BY
 * assets; see the credits in Settings and the README.
 */
export default function ShipModel({
  shipId,
  size = 160,
  className = "",
  view = "turntable",
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
    scene.environmentIntensity = view === "chase" ? 0.35 : 0.55;

    if (view === "chase") {
      // Hyperspace ahead of the nose: strong cool backlight, faint warm fill
      // from the camera side so the hull reads without killing the rim.
      const tunnel = new THREE.DirectionalLight(0x9cc8ff, 3.2);
      tunnel.position.set(0, 1.5, -5);
      scene.add(tunnel);
      const tunnelLow = new THREE.DirectionalLight(0x6f9fe8, 1.4);
      tunnelLow.position.set(0, -2.5, -3);
      scene.add(tunnelLow);
      const fill = new THREE.DirectionalLight(0xffe2c0, 0.5);
      fill.position.set(1.5, 3, 4);
      scene.add(fill);
      scene.add(new THREE.HemisphereLight(0x8fb3e8, 0x0a0d18, 0.5));
    } else {
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
    }

    const pivot = new THREE.Group();
    scene.add(pivot);

    let disposed = false;
    let raf = 0;

    const reduceMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion");

    loadModel(ship.model).then((gltf) => {
      if (disposed) return;
      const object = gltf.scene.clone(true);

      // Centre on origin and normalise scale from the bounding sphere.
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      object.position.sub(center);
      const s = 1 / (sphere.radius || 1);
      object.scale.setScalar(s);

      const inner = new THREE.Group();
      inner.add(object);
      pivot.add(inner);

      if (view === "chase") {
        // Nose into the screen, slight sideways offset so the pose isn't
        // dead-symmetric; camera high behind, looking down past the hull.
        inner.rotation.y = ship.noseYaw + 0.1;
        inner.rotation.x = 0.12;
        camera.position.set(0, 1.35, 2.35 * ship.modelZoom);
        camera.lookAt(0, -0.05, -0.6);
      } else {
        inner.rotation.y = ship.modelYaw;
        camera.position.set(0, 0.55, 2.6 * ship.modelZoom);
        camera.lookAt(0, 0, 0);
      }

      const t0 = performance.now();
      const render = (now: number) => {
        if (disposed) return;
        const t = (now - t0) / 1000;
        if (view === "turntable" && spin && !reduceMotion) {
          pivot.rotation.y = t * 0.35;
        }
        if (view === "chase" && !reduceMotion) {
          // Gentle drift and banking, like holding formation in the tunnel.
          pivot.position.y = Math.sin(t * 0.7) * 0.05;
          pivot.position.x = Math.sin(t * 0.45) * 0.04;
          pivot.rotation.z = Math.sin(t * 0.5) * 0.07;
          pivot.rotation.x = Math.sin(t * 0.9) * 0.03;
        }
        renderer.render(scene, camera);
        if ((view === "chase" || spin) && !reduceMotion) {
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
  }, [shipId, size, view, spin]);

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
