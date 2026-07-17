import { PLANET_MAP, ROUTES, Route } from "./data";

export interface Leg {
  from: string;
  to: string;
  distance: number; // KLY
  duration: number; // minutes
}

export interface PathResult {
  path: string[]; // planet ids, origin first
  legs: Leg[];
  distance: number; // KLY
  duration: number; // minutes
}

interface Neighbor {
  to: string;
  route: Route;
}

const ADJACENCY: Record<string, Neighbor[]> = {};
for (const route of ROUTES) {
  (ADJACENCY[route.from] ??= []).push({ to: route.to, route });
  (ADJACENCY[route.to] ??= []).push({ to: route.from, route });
}

export function neighborsOf(id: string): string[] {
  return (ADJACENCY[id] ?? []).map((n) => n.to);
}

/**
 * Dijkstra over the hyperspace lane network, weighted by distance.
 * Returns null when no lane sequence connects the two planets.
 */
export function findPath(origin: string, destination: string): PathResult | null {
  if (!PLANET_MAP[origin] || !PLANET_MAP[destination]) return null;
  if (origin === destination) {
    return { path: [origin], legs: [], distance: 0, duration: 0 };
  }

  const dist: Record<string, number> = { [origin]: 0 };
  const prev: Record<string, { from: string; route: Route }> = {};
  const visited = new Set<string>();
  const queue: [string, number][] = [[origin, 0]];

  while (queue.length > 0) {
    queue.sort((a, b) => a[1] - b[1]);
    const [node] = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);
    if (node === destination) break;

    for (const { to, route } of ADJACENCY[node] ?? []) {
      if (visited.has(to)) continue;
      const next = dist[node] + route.distance;
      if (next < (dist[to] ?? Infinity)) {
        dist[to] = next;
        prev[to] = { from: node, route };
        queue.push([to, next]);
      }
    }
  }

  if (!(destination in prev)) return null;

  const path: string[] = [destination];
  const legs: Leg[] = [];
  let cursor = destination;
  while (cursor !== origin) {
    const { from, route } = prev[cursor];
    legs.unshift({
      from,
      to: cursor,
      distance: route.distance,
      duration: route.duration,
    });
    path.unshift(from);
    cursor = from;
  }

  const distance = Math.round(legs.reduce((s, l) => s + l.distance, 0) * 10) / 10;
  const duration = legs.reduce((s, l) => s + l.duration, 0);
  return { path, legs, distance, duration };
}
