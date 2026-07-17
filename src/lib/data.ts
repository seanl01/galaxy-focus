// ---------------------------------------------------------------------------
// Focus Flight — static galaxy data
//
// Coordinates are in a 0–100 map space. Physical scale is calibrated so the
// canonical Coruscant → Corellia → Naboo → Tatooine run measures 16.4 KLY
// and 41 minutes of real-world focus time (2.5 min per KLY).
// ---------------------------------------------------------------------------

export type Region = "Core Worlds" | "Mid Rim" | "Outer Rim" | "Unknown Regions";

export type PlanetKind =
  | "city"
  | "desert"
  | "ice"
  | "lava"
  | "forest"
  | "gas"
  | "ocean"
  | "rock"
  | "storm";

export interface Planet {
  id: string;
  name: string;
  region: Region;
  x: number; // 0–100 map space
  y: number; // 0–100 map space
  kind: PlanetKind;
  description: string;
  colors: [string, string, string]; // highlight, mid, shadow
}

export interface Route {
  from: string;
  to: string;
  distance: number; // KLY
  duration: number; // minutes
}

export interface ChasePose {
  yawOff: number; // degrees on top of noseYaw
  pitch: number; // degrees
  roll: number; // degrees
  camX: number;
  camY: number;
  camZ: number;
  lookY: number;
  lookZ: number;
  scale: number; // apparent size multiplier on the normalized model
}

export interface Ship {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  model: string; // GLB path under /public
  modelYaw: number; // turntable pose: rotation for a pleasing 3/4 angle
  noseYaw: number; // chase pose: rotation that points the nose away from camera
  modelZoom: number; // camera distance multiplier
  chase: ChasePose; // exterior-view framing, tuned by hand via /tune
  credit: string; // CC-BY attribution (see README)
}

// Hand-tuned on the X-Wing via /tune; a slight three-quarter from astern.
// Reused for every ship until a ship gets its own numbers.
const DEFAULT_CHASE: ChasePose = {
  yawOff: -24.5,
  pitch: 6.5,
  roll: -6.5,
  camX: 0,
  camY: 0.65,
  camZ: 4.9,
  lookY: -0.2,
  lookZ: -10.25,
  scale: 1,
};

export const KLY_PER_UNIT = 0.5;
export const MIN_PER_KLY = 2.5;

// Public assets live under the deployment base path (e.g. /galaxy-focus on
// GitHub Pages). Manual fetches like GLTFLoader don't get Next's basePath
// rewriting, so prefix them explicitly.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const PLANETS: Planet[] = [
  // Core Worlds -------------------------------------------------------------
  {
    id: "coruscant",
    name: "Coruscant",
    region: "Core Worlds",
    x: 52,
    y: 48,
    kind: "city",
    description:
      "The galactic capital. One endless city, a trillion lights that never sleep.",
    colors: ["#ffe9b0", "#c8a24d", "#4a3b1e"],
  },
  {
    id: "chandrila",
    name: "Chandrila",
    region: "Core Worlds",
    x: 58,
    y: 41,
    kind: "ocean",
    description:
      "Green hills and calm seas. Birthplace of the New Republic's quiet resolve.",
    colors: ["#bfe8c9", "#4f9e77", "#173a2c"],
  },
  {
    id: "alderaan",
    name: "Alderaan",
    region: "Core Worlds",
    x: 45,
    y: 41,
    kind: "ocean",
    description:
      "Mountains, oceans and art. A world devoted to peace, remembered by all.",
    colors: ["#dceafc", "#6d9fd8", "#22456e"],
  },
  {
    id: "corellia",
    name: "Corellia",
    region: "Core Worlds",
    x: 44,
    y: 54,
    kind: "city",
    description:
      "Shipyards and smugglers. If it flies fast, it was probably built here.",
    colors: ["#e8dcc4", "#9c8a63", "#3c3423"],
  },

  // Mid Rim -----------------------------------------------------------------
  {
    id: "naboo",
    name: "Naboo",
    region: "Mid Rim",
    x: 37,
    y: 63,
    kind: "ocean",
    description:
      "Rolling meadows above, porous seas below. Elegance in everything.",
    colors: ["#d3f0d8", "#5fae7c", "#1d4634"],
  },
  {
    id: "kashyyyk",
    name: "Kashyyyk",
    region: "Mid Rim",
    x: 60,
    y: 62,
    kind: "forest",
    description:
      "Wroshyr trees a kilometre tall. Home of the Wookiees and older things below.",
    colors: ["#c9e6a8", "#5d8f43", "#233a17"],
  },
  {
    id: "malastare",
    name: "Malastare",
    region: "Mid Rim",
    x: 45,
    y: 68,
    kind: "rock",
    description:
      "Fuel fields and podracing circuits carved through methane lakes.",
    colors: ["#f0d9a8", "#b08d4f", "#4a3617"],
  },

  // Outer Rim ---------------------------------------------------------------
  {
    id: "tatooine",
    name: "Tatooine",
    region: "Outer Rim",
    x: 29,
    y: 72,
    kind: "desert",
    description:
      "Twin suns over endless dunes. If there's a bright centre to the galaxy, this is the planet it's farthest from.",
    colors: ["#ffe4ae", "#d8a95c", "#6b4a1f"],
  },
  {
    id: "geonosis",
    name: "Geonosis",
    region: "Outer Rim",
    x: 24,
    y: 79,
    kind: "rock",
    description:
      "Red rock spires and droid foundries humming beneath the crust.",
    colors: ["#f5c9a0", "#c07848", "#5a2e17"],
  },
  {
    id: "mustafar",
    name: "Mustafar",
    region: "Outer Rim",
    x: 68,
    y: 74,
    kind: "lava",
    description:
      "Rivers of fire beneath an ash-black sky. A place of endings.",
    colors: ["#ffb37a", "#e04f1f", "#3d0f05"],
  },
  {
    id: "scarif",
    name: "Scarif",
    region: "Outer Rim",
    x: 59,
    y: 83,
    kind: "ocean",
    description:
      "Turquoise shallows and white sand — an idyll wrapped in an Imperial shield.",
    colors: ["#d8f6f0", "#4fc0ae", "#12463f"],
  },
  {
    id: "mandalore",
    name: "Mandalore",
    region: "Outer Rim",
    x: 68,
    y: 31,
    kind: "rock",
    description:
      "Glass-domed cities over a scarred desert. This is the Way.",
    colors: ["#e6e9ee", "#8d97a8", "#31394a"],
  },
  {
    id: "lothal",
    name: "Lothal",
    region: "Outer Rim",
    x: 77,
    y: 40,
    kind: "storm",
    description:
      "Grass plains and painted skies at the frontier of rebellion.",
    colors: ["#ffe9c9", "#c99e5f", "#4f3a1f"],
  },
  {
    id: "hoth",
    name: "Hoth",
    region: "Outer Rim",
    x: 17,
    y: 59,
    kind: "ice",
    description:
      "A white silence broken only by wind. Nights fall to minus sixty.",
    colors: ["#f2fbff", "#a8cfe8", "#3a5f7d"],
  },
  {
    id: "bespin",
    name: "Bespin",
    region: "Outer Rim",
    x: 14,
    y: 50,
    kind: "gas",
    description:
      "A city in the clouds, mining Tibanna gas above a rose-coloured deep.",
    colors: ["#ffe3c4", "#e09a5e", "#6e3d1f"],
  },
  {
    id: "endor",
    name: "Endor",
    region: "Outer Rim",
    x: 23,
    y: 23,
    kind: "forest",
    description:
      "The forest moon. Ancient redwoods, small guardians, old victories.",
    colors: ["#d6ecb8", "#6ba054", "#26401e"],
  },
  {
    id: "jakku",
    name: "Jakku",
    region: "Outer Rim",
    x: 28,
    y: 36,
    kind: "desert",
    description:
      "A graveyard of star destroyers half-buried in scavenger sands.",
    colors: ["#f7e2b8", "#c9a05e", "#57401f"],
  },

  // Unknown Regions ----------------------------------------------------------
  {
    id: "exegol",
    name: "Exegol",
    region: "Unknown Regions",
    x: 11,
    y: 18,
    kind: "storm",
    description:
      "A hidden world of dry lightning beyond the charted lanes.",
    colors: ["#cfd4e8", "#5d6488", "#181b2e"],
  },
];

export const PLANET_MAP: Record<string, Planet> = Object.fromEntries(
  PLANETS.map((p) => [p.id, p])
);

// Hyperspace lanes — undirected edges. Distance & duration derive from map
// geometry so the network stays self-consistent.
const LANES: [string, string][] = [
  ["coruscant", "alderaan"],
  ["coruscant", "chandrila"],
  ["coruscant", "corellia"],
  ["alderaan", "corellia"],
  ["chandrila", "mandalore"],
  ["mandalore", "lothal"],
  ["corellia", "naboo"],
  ["corellia", "kashyyyk"],
  ["kashyyyk", "mustafar"],
  ["mustafar", "scarif"],
  ["kashyyyk", "malastare"],
  ["naboo", "malastare"],
  ["naboo", "tatooine"],
  ["tatooine", "geonosis"],
  ["tatooine", "bespin"],
  ["bespin", "hoth"],
  ["alderaan", "jakku"],
  ["jakku", "endor"],
  ["endor", "bespin"],
  ["jakku", "exegol"],
];

function edge(from: string, to: string): Route {
  const a = PLANET_MAP[from];
  const b = PLANET_MAP[to];
  const units = Math.hypot(a.x - b.x, a.y - b.y);
  const distance = Math.round(units * KLY_PER_UNIT * 10) / 10;
  const duration = Math.max(3, Math.round(distance * MIN_PER_KLY));
  return { from, to, distance, duration };
}

export const ROUTES: Route[] = LANES.map(([a, b]) => edge(a, b));

// All ship models are CC-BY assets from poly.pizza — credits listed per ship
// and in the README. Cosmetic only; no gameplay differences.
export const SHIPS: Ship[] = [
  {
    id: "xwing",
    name: "X-Wing",
    tagline: "Balanced and reliable.",
    accent: "#ff6a4d",
    model: `${BASE}/models/xwing.glb`,
    noseYaw: 0,
    modelYaw: Math.PI * 0.75,
    modelZoom: 1,
    chase: DEFAULT_CHASE,
    credit: "x-wing by Alberto Calvo (CC-BY, poly.pizza)",
  },
  {
    id: "tie",
    name: "TIE Fighter",
    tagline: "Fast and relentless.",
    accent: "#8fb8ff",
    model: `${BASE}/models/tie.glb`,
    noseYaw: Math.PI,
    modelYaw: Math.PI * 0.25,
    modelZoom: 1,
    chase: DEFAULT_CHASE,
    credit: "Tie Fighter by David O'Brien (-BlanK-) (CC-BY, poly.pizza)",
  },
  {
    id: "stardestroyer",
    name: "Star Destroyer",
    tagline: "Overwhelming presence.",
    accent: "#c9d4e4",
    model: `${BASE}/models/stardestroyer.glb`,
    noseYaw: Math.PI / 2,
    modelYaw: Math.PI * 0.35,
    modelZoom: 1.05,
    // Tuned by hand: dead-astern, low camera, hull filling the frame.
    chase: {
      yawOff: 0,
      pitch: 6.5,
      roll: 1,
      camX: 0.05,
      camY: 0.5,
      camZ: 5.15,
      lookY: -0.7,
      lookZ: -10.25,
      scale: 1.45,
    },
    credit:
      "Low Poly Imperial Star Destroyer by Digital Sock (CC-BY 4.0, sketchfab.com)",
  },
  {
    id: "speeder",
    name: "Speeder Bike",
    tagline: "Light, loud, low altitude.",
    accent: "#ffd98a",
    model: `${BASE}/models/speeder.glb`,
    noseYaw: Math.PI / 2,
    modelYaw: Math.PI * 0.65,
    modelZoom: 1,
    chase: DEFAULT_CHASE,
    credit: "Speeder Bike by Joe Scalise (CC-BY, poly.pizza)",
  },
];

export const SHIP_MAP: Record<string, Ship> = Object.fromEntries(
  SHIPS.map((s) => [s.id, s])
);

export const REGION_ORDER: Region[] = [
  "Core Worlds",
  "Mid Rim",
  "Outer Rim",
  "Unknown Regions",
];
