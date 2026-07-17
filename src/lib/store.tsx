"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PLANET_MAP, SHIP_MAP, SHIPS } from "./data";
import { findPath } from "./graph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Settings {
  focusMode: "route" | "custom";
  customMinutes: number;
  shortBreak: number;
  autoStartBreaks: boolean;
  reduceMotion: boolean;
  sound: boolean;
}

export interface ActiveJourney {
  originId: string;
  destinationId: string;
  path: string[];
  shipId: string;
  totalSeconds: number;
  distance: number; // KLY
  startedAt: number; // epoch ms of the current run segment
  elapsedBefore: number; // seconds accumulated before the current run segment
  paused: boolean;
}

export interface JourneyRecord {
  id: string;
  originId: string;
  destinationId: string;
  path: string[];
  shipId: string;
  focusSeconds: number;
  distance: number;
  completedAt: number;
}

interface AppState {
  currentPlanetId: string;
  shipId: string;
  visited: string[];
  history: JourneyRecord[];
  settings: Settings;
  journey: ActiveJourney | null;
}

const DEFAULT_STATE: AppState = {
  currentPlanetId: "coruscant",
  shipId: SHIPS[0].id,
  visited: ["coruscant"],
  history: [],
  settings: {
    focusMode: "route",
    customMinutes: 25,
    shortBreak: 5,
    autoStartBreaks: false,
    reduceMotion: false,
    sound: true,
  },
  journey: null,
};

const STORAGE_KEY = "focus-flight-state-v1";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface StoreValue extends AppState {
  ready: boolean;
  setShip: (shipId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  startJourney: (destinationId: string, shipId: string) => boolean;
  pauseJourney: () => void;
  resumeJourney: () => void;
  abortJourney: () => void;
  completeJourney: () => void;
  fastForward: (secondsLeft: number) => void;
  journeyElapsed: () => number;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const merged: AppState = {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
    };
    // The hangar roster can change between versions — drop stale ship ids.
    if (!SHIP_MAP[merged.shipId]) merged.shipId = DEFAULT_STATE.shipId;
    if (merged.journey && !SHIP_MAP[merged.journey.shipId]) {
      merged.journey = { ...merged.journey, shipId: DEFAULT_STATE.shipId };
    }
    return merged;
  } catch {
    return DEFAULT_STATE;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  // Persist on every change once hydrated.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — journey continues in memory
    }
  }, [state, ready]);

  // Mirror the reduce-motion preference onto <html> so CSS can honour it.
  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      state.settings.reduceMotion
    );
  }, [state.settings.reduceMotion]);

  const setShip = useCallback((shipId: string) => {
    setState((s) => ({ ...s, shipId }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const startJourney = useCallback(
    (destinationId: string, shipId: string): boolean => {
      const s = stateRef.current;
      const result = findPath(s.currentPlanetId, destinationId);
      if (!result || result.legs.length === 0) return false;
      const minutes =
        s.settings.focusMode === "custom"
          ? s.settings.customMinutes
          : result.duration;
      const journey: ActiveJourney = {
        originId: s.currentPlanetId,
        destinationId,
        path: result.path,
        shipId,
        totalSeconds: Math.max(60, Math.round(minutes * 60)),
        distance: result.distance,
        startedAt: Date.now(),
        elapsedBefore: 0,
        paused: false,
      };
      setState((prev) => ({ ...prev, shipId, journey }));
      return true;
    },
    []
  );

  const journeyElapsed = useCallback((): number => {
    const j = stateRef.current.journey;
    if (!j) return 0;
    if (j.paused) return j.elapsedBefore;
    return j.elapsedBefore + (Date.now() - j.startedAt) / 1000;
  }, []);

  const pauseJourney = useCallback(() => {
    setState((s) => {
      if (!s.journey || s.journey.paused) return s;
      const elapsed =
        s.journey.elapsedBefore + (Date.now() - s.journey.startedAt) / 1000;
      return {
        ...s,
        journey: { ...s.journey, paused: true, elapsedBefore: elapsed },
      };
    });
  }, []);

  const resumeJourney = useCallback(() => {
    setState((s) => {
      if (!s.journey || !s.journey.paused) return s;
      return {
        ...s,
        journey: { ...s.journey, paused: false, startedAt: Date.now() },
      };
    });
  }, []);

  const abortJourney = useCallback(() => {
    setState((s) => ({ ...s, journey: null }));
  }, []);

  // Dev/preview helper: jump the clock so `secondsLeft` remain.
  const fastForward = useCallback((secondsLeft: number) => {
    setState((s) => {
      if (!s.journey) return s;
      return {
        ...s,
        journey: {
          ...s.journey,
          elapsedBefore: Math.max(0, s.journey.totalSeconds - secondsLeft),
          startedAt: Date.now(),
        },
      };
    });
  }, []);

  const completeJourney = useCallback(() => {
    setState((s) => {
      if (!s.journey) return s;
      const j = s.journey;
      const record: JourneyRecord = {
        id: `${j.destinationId}-${Date.now()}`,
        originId: j.originId,
        destinationId: j.destinationId,
        path: j.path,
        shipId: j.shipId,
        focusSeconds: j.totalSeconds,
        distance: j.distance,
        completedAt: Date.now(),
      };
      const visited = s.visited.includes(j.destinationId)
        ? s.visited
        : [...s.visited, j.destinationId];
      return {
        ...s,
        currentPlanetId: j.destinationId,
        visited,
        history: [record, ...s.history].slice(0, 200),
        journey: null,
      };
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      ready,
      setShip,
      updateSettings,
      startJourney,
      pauseJourney,
      resumeJourney,
      abortJourney,
      completeJourney,
      fastForward,
      journeyElapsed,
    }),
    [
      state,
      ready,
      setShip,
      updateSettings,
      startJourney,
      pauseJourney,
      resumeJourney,
      abortJourney,
      completeJourney,
      fastForward,
      journeyElapsed,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export function planetName(id: string): string {
  return PLANET_MAP[id]?.name ?? id;
}
