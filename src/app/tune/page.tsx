"use client";

// Hidden chase-view tuning page (not linked from the nav).
// Adjust the sliders until the ship reads right, then copy the values
// from the readout box. Values map 1:1 onto the chase pose in ShipModel.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Hyperspace from "@/components/Hyperspace";
import { SHIPS } from "@/lib/data";

interface Params {
  yawDeg: number; // inner.rotation.y
  pitchDeg: number; // inner.rotation.x
  rollDeg: number; // inner.rotation.z
  camX: number;
  camY: number;
  camZ: number;
  lookY: number;
  lookZ: number;
}

const DEG = Math.PI / 180;

function defaultsFor(shipIndex: number): Params {
  const ship = SHIPS[shipIndex];
  return {
    yawDeg: Math.round((ship.noseYaw / DEG + 5.7) * 10) / 10,
    pitchDeg: 6.9,
    rollDeg: 0,
    camX: 0,
    camY: 1.35,
    camZ: Math.round(2.35 * ship.modelZoom * 100) / 100,
    lookY: -0.05,
    lookZ: -0.6,
  };
}

const SLIDERS: {
  key: keyof Params;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "yawDeg", label: "Ship yaw (°)", min: 0, max: 360, step: 0.5 },
  { key: "pitchDeg", label: "Ship pitch (°)", min: -60, max: 60, step: 0.5 },
  { key: "rollDeg", label: "Ship roll (°)", min: -60, max: 60, step: 0.5 },
  { key: "camX", label: "Camera X", min: -2, max: 2, step: 0.05 },
  { key: "camY", label: "Camera Y (height)", min: -1, max: 3.5, step: 0.05 },
  { key: "camZ", label: "Camera Z (distance)", min: 0.8, max: 6, step: 0.05 },
  { key: "lookY", label: "Look-at Y", min: -1.5, max: 1.5, step: 0.05 },
  { key: "lookZ", label: "Look-at Z", min: -3, max: 1, step: 0.05 },
];

export default function TunePage() {
  const [shipIndex, setShipIndex] = useState(0);
  const [params, setParams] = useState<Params>(() => defaultsFor(0));
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const ship = SHIPS[shipIndex];

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.35;
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

    const inner = new THREE.Group();
    scene.add(inner);

    let disposed = false;
    let raf = 0;
    new GLTFLoader().loadAsync(ship.model).then((gltf) => {
      if (disposed) return;
      const object = gltf.scene;
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      object.position.sub(center);
      object.scale.setScalar(1 / (sphere.radius || 1));
      inner.add(object);

      const render = () => {
        if (disposed) return;
        const p = paramsRef.current;
        inner.rotation.set(p.pitchDeg * DEG, p.yawDeg * DEG, p.rollDeg * DEG);
        camera.position.set(p.camX, p.camY, p.camZ);
        camera.lookAt(0, p.lookY, p.lookZ);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(render);
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
  }, [shipIndex]);

  const ship = SHIPS[shipIndex];
  const readout = `${ship.id}: yaw=${params.yawDeg}° pitch=${params.pitchDeg}° roll=${params.rollDeg}° cam=(${params.camX}, ${params.camY}, ${params.camZ}) look=(0, ${params.lookY}, ${params.lookZ})`;

  return (
    <main className="relative h-screen select-none overflow-hidden bg-space-950">
      <Hyperspace warp={1} />
      <div
        ref={mountRef}
        className="pointer-events-none absolute left-1/2 top-[8%] z-10 h-[347px] w-[560px] -translate-x-1/2"
        key={shipIndex}
      />

      {/* control panel */}
      <div className="glass absolute right-4 top-4 z-20 w-80 p-5">
        <p className="label-caps mb-3">Chase View Tuner</p>

        <select
          value={shipIndex}
          onChange={(e) => {
            const i = Number(e.target.value);
            setShipIndex(i);
            setParams(defaultsFor(i));
          }}
          className="mb-4 w-full rounded-lg border border-white/15 bg-space-900 px-3 py-2 text-sm text-slate-200"
        >
          {SHIPS.map((s, i) => (
            <option key={s.id} value={i}>
              {s.name}
            </option>
          ))}
        </select>

        {SLIDERS.map((s) => (
          <label key={s.key} className="mb-2 block">
            <span className="flex justify-between text-[11px] uppercase tracking-[0.15em] text-slate-400">
              {s.label}
              <span className="tabular-nums text-slate-200">
                {params[s.key]}
              </span>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={params[s.key]}
              onChange={(e) =>
                setParams((p) => ({ ...p, [s.key]: Number(e.target.value) }))
              }
              className="w-full accent-[#e5c15c]"
            />
          </label>
        ))}

        <button
          onClick={() => setParams(defaultsFor(shipIndex))}
          className="btn-ghost mt-1 w-full px-4 py-2 text-[11px]"
        >
          Reset to current
        </button>

        <p className="label-caps mb-1 mt-4">Send these numbers</p>
        <textarea
          readOnly
          value={readout}
          onFocus={(e) => e.target.select()}
          className="h-20 w-full rounded-lg border border-white/15 bg-space-900 p-2 text-xs text-glow-gold"
        />
      </div>
    </main>
  );
}
