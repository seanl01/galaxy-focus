"use client";

import { MutableRefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SHIP_MAP } from "@/lib/data";
import { loadShipModel } from "@/components/ShipModel";

/** Live camera/pose overrides for the hidden /tune page. */
export interface ChaseTuning {
  yawDeg: number; // extra yaw on top of the ship's noseYaw
  pitchDeg: number;
  rollDeg: number;
  camX: number;
  camY: number;
  camZ: number;
  lookY: number;
  lookZ: number;
  warp: number;
}

interface ChaseViewProps {
  shipId: string;
  /** 0 = drifting stars, 1 = full hyperspace. Eased internally. */
  warp: number;
  className?: string;
  /** When set, freezes procedural motion and reads pose from the ref each frame. */
  tuningRef?: MutableRefObject<ChaseTuning>;
}

const TUNNEL_LEN = 70;
const STREAK_COUNT = 1200;
const DEG = Math.PI / 180;

// The whole streak field lives on the GPU: each streak is a 2-vertex line
// whose head position is derived from a scroll uniform, so the CPU only
// updates two floats per frame no matter how many streaks there are.
const STREAK_VERT = /* glsl */ `
  uniform float uScroll; // travel distance, integrated on the CPU
  uniform float uWarp;   // eased warp 0..1

  attribute float aSpeed;  // relative speed; also stretches the streak
  attribute float aBright; // per-streak brightness
  attribute float aHead;   // 1 = leading vertex, 0 = trailing vertex

  varying float vAlpha;
  varying float vBright;

  void main() {
    // position.xy is the streak's slot in the tunnel cross-section;
    // position.z is its phase. March it down the tunnel and wrap.
    float cycle = mod(position.z + uScroll * aSpeed, ${TUNNEL_LEN}.0);
    // Span the tunnel from far ahead of the ship to just behind the camera.
    float zHead = cycle - ${TUNNEL_LEN - 12}.0;
    // Faster streaks stretch longer; everything stretches with warp.
    float len = aSpeed * (0.05 + uWarp * uWarp * 2.2);
    float z = zHead - (1.0 - aHead) * len;

    // Fade in after spawning and out before wrapping so nothing pops.
    float edge = smoothstep(0.0, 8.0, cycle)
               * (1.0 - smoothstep(${TUNNEL_LEN - 3}.0, ${TUNNEL_LEN}.0, cycle));
    // Distant streaks dim — cheap depth cue instead of fog.
    float depth = smoothstep(-50.0, 6.0, zHead);

    vAlpha = edge * (0.3 + 0.7 * depth) * (0.4 + 0.6 * uWarp);
    vBright = aBright;
    gl_Position = projectionMatrix * modelViewMatrix
                * vec4(position.xy, z, 1.0);
  }
`;

const STREAK_FRAG = /* glsl */ `
  varying float vAlpha;
  varying float vBright;

  void main() {
    // Dim streaks sit deep blue; bright ones burn toward white.
    vec3 col = mix(vec3(0.4, 0.58, 1.0), vec3(0.93, 0.96, 1.0), vBright);
    gl_FragColor = vec4(col, vAlpha * (0.45 + 0.55 * vBright));
  }
`;

function buildStreakField(): THREE.LineSegments {
  const pos = new Float32Array(STREAK_COUNT * 6);
  const speed = new Float32Array(STREAK_COUNT * 2);
  const bright = new Float32Array(STREAK_COUNT * 2);
  const head = new Float32Array(STREAK_COUNT * 2);

  for (let i = 0; i < STREAK_COUNT; i++) {
    // Annulus around the flight axis; bias toward the middle distance and
    // keep a clear core so streaks don't clip through the hull.
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.6 + Math.pow(Math.random(), 1.6) * 8;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.85;
    const z = Math.random() * TUNNEL_LEN;
    // Three loose speed bands read as near/medium/far layers.
    const band = Math.random();
    const s = band < 0.34 ? 0.5 + Math.random() * 0.4
            : band < 0.75 ? 0.9 + Math.random() * 0.6
            : 1.5 + Math.random() * 0.8;
    const b = 0.25 + Math.pow(Math.random(), 2) * 0.75;

    for (let v = 0; v < 2; v++) {
      const j = i * 2 + v;
      pos.set([x, y, z], j * 3);
      speed[j] = s;
      bright[j] = b;
      head[j] = v;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
  geometry.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
  geometry.setAttribute("aHead", new THREE.BufferAttribute(head, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: STREAK_VERT,
    fragmentShader: STREAK_FRAG,
    uniforms: { uScroll: { value: 0 }, uWarp: { value: 0 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false; // positions are computed in the shader
  return lines;
}

function makeGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.25, "rgba(150,190,255,0.6)");
  g.addColorStop(0.6, "rgba(90,130,235,0.2)");
  g.addColorStop(1, "rgba(60,90,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The flagship exterior view: ship, hyperspace streaks and camera share one
 * 3D scene, so the streak field's vanishing point sits exactly on the ship's
 * direction of travel. The camera hangs behind and above the ship with slow
 * noise-like drift and lags the ship's banking for a sense of weight.
 */
export default function ChaseView({
  shipId,
  warp,
  className = "",
  tuningRef,
}: ChaseViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const warpRef = useRef(warp);
  warpRef.current = warp;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const ship = SHIP_MAP[shipId];
    if (!ship) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      38,
      mount.clientWidth / mount.clientHeight,
      0.1,
      140
    );

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.35;

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

    const streaks = buildStreakField();
    scene.add(streaks);
    const streakUniforms = (streaks.material as THREE.ShaderMaterial).uniforms;

    // rig carries the formation-flying drift; inner carries the base pose.
    const rig = new THREE.Group();
    scene.add(rig);
    const inner = new THREE.Group();
    rig.add(inner);

    const glowTexture = makeGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    });
    const glow = new THREE.Sprite(glowMaterial);
    const engineLight = new THREE.PointLight(0x86b8ff, 0, 6);

    const reduceMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion");

    let disposed = false;
    let raf = 0;
    let loadedAt = -1;

    loadShipModel(ship.model).then((gltf) => {
      if (disposed) return;
      const object = gltf.scene.clone(true);
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      object.position.sub(center);
      object.scale.setScalar(1 / (sphere.radius || 1));
      inner.add(object);

      // Find the stern while the nose points exactly down -Z, then parent the
      // engine glow inside `inner` so it follows any pose applied on top.
      inner.rotation.set(0, ship.noseYaw, 0);
      const posed = new THREE.Box3().setFromObject(inner);
      const stern = new THREE.Vector3(0, 0, Math.max(0.25, posed.max.z * 0.9));
      stern.applyAxisAngle(new THREE.Vector3(0, 1, 0), -ship.noseYaw);
      glow.position.copy(stern);
      glow.scale.setScalar(1.1);
      engineLight.position.copy(stern);
      inner.add(glow);
      inner.add(engineLight);

      // Baked chase pose (hand-tuned via /tune).
      const pose = ship.chase;
      inner.rotation.set(
        pose.pitch * DEG,
        ship.noseYaw + pose.yawOff * DEG,
        pose.roll * DEG
      );

      loadedAt = performance.now();
    });

    let scroll = 0;
    let eased = warpRef.current;
    let camRoll = 0;
    let last = performance.now();
    // Two incommensurate sines approximate slow 1D noise without a noise lib.
    const drift = (t: number, a: number, b: number) =>
      Math.sin(t * a) * 0.62 + Math.sin(t * b + 1.7) * 0.38;

    const render = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = now / 1000;
      const tune = tuningRef?.current;

      const target = tune ? tune.warp : warpRef.current;
      eased += (target - eased) * Math.min(1, dt * 1.6);
      const w = Math.max(0, Math.min(1, eased));

      scroll += dt * (reduceMotion ? 0.6 : 1.2 + w * w * 14);
      streakUniforms.uScroll.value = scroll;
      streakUniforms.uWarp.value = reduceMotion ? Math.min(w, 0.25) : w;

      // Ship micro-motion: holding formation in the tunnel.
      if (!reduceMotion && !tune) {
        rig.position.y = Math.sin(t * 0.5) * 0.07 + Math.sin(t * 0.83 + 2) * 0.03;
        rig.position.x = Math.sin(t * 0.31) * 0.08;
        rig.rotation.z = Math.sin(t * 0.4) * 0.045 + Math.sin(t * 0.9 + 1) * 0.015;
        rig.rotation.x = Math.sin(t * 0.55 + 0.7) * 0.02;
        rig.rotation.y = Math.sin(t * 0.24) * 0.03;
      }

      // Scale-in on load; engine glow breathes (spec: 1.2 → 1.8).
      const appear =
        loadedAt < 0 ? 0 : Math.min(1, (now - loadedAt) / 800);
      const pop = 1 - (1 - appear) * (1 - appear);
      rig.scale.setScalar(0.94 + 0.06 * pop);
      const pulse = Math.sin(t * 2.1);
      glowMaterial.opacity = pop * (0.42 + 0.14 * pulse) * (0.5 + 0.5 * w);
      engineLight.intensity = pop * (1.5 + 0.3 * pulse);

      if (tune) {
        inner.rotation.set(
          tune.pitchDeg * DEG,
          ship.noseYaw + tune.yawDeg * DEG,
          tune.rollDeg * DEG
        );
        camera.position.set(tune.camX, tune.camY, tune.camZ);
        camera.lookAt(0, tune.lookY, tune.lookZ);
      } else {
        // Behind the ship on the travel axis, looking down-tunnel — plus
        // drift, a touch of shake deep in warp, and a lagged copy of the
        // ship's bank. Base framing comes from the ship's baked chase pose.
        const pose = ship.chase;
        const shake = reduceMotion ? 0 : Math.max(0, w - 0.55) * 0.014;
        camera.position.set(
          (reduceMotion ? 0 : drift(t, 0.11, 0.23) * 0.1) +
            Math.sin(t * 13.1) * shake,
          pose.camY +
            (reduceMotion ? 0 : drift(t, 0.09, 0.19) * 0.06) +
            Math.sin(t * 16.7) * shake,
          pose.camZ
        );
        camera.lookAt(0, pose.lookY, pose.lookZ);
        camRoll += (rig.rotation.z * 0.28 - camRoll) * Math.min(1, dt * 2);
        camera.rotateZ(-camRoll);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      streaks.geometry.dispose();
      (streaks.material as THREE.Material).dispose();
      glowTexture.dispose();
      glowMaterial.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [shipId, tuningRef]);

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden
    />
  );
}
