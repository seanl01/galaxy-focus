# Focus Flight — Galaxy Edition

> Every focus session is a journey across the galaxy. Choose a destination,
> follow a valid hyperspace route, and stay focused until you arrive.

A Star Wars–inspired productivity app. Instead of setting a "25 minute timer",
you plot a course — *Coruscant → Corellia → Naboo → Tatooine* — and the
route's real flight time becomes your focus session. Complete the flight and
you arrive; end early and you don't.

A fan-made concept for educational purposes. Not affiliated with Lucasfilm.

## Features (MVP)

- **Interactive galaxy map** — 18 iconic planets across the Core Worlds, Mid
  Rim, Outer Rim and Unknown Regions, connected by a hyperspace-lane graph.
  You can only travel along valid routes (Dijkstra picks the shortest one).
- **Consistent physics** — distances derive from map geometry, calibrated so
  Coruscant → Tatooine is 16.4 KLY / 41 minutes.
- **Ship selection** — five vessels rendered as real 3D models (glTF/three.js)
  on slowly rotating turntables. Cosmetic only.
- **Cinematic hyperspace** — 3-second cancellable jump countdown, canvas
  starfield → streak tunnel, then a calm full-screen focus timer.
- **Cockpit ⇄ exterior view** — watch your ship bank through hyperspace.
- **Approach & arrival** — in the last stretch the streaks slow, the
  destination planet grows into view, and arrival plays a soft chime.
- **Journey log** — flight history, hours focused, worlds visited, distance
  traveled, streak, favorite vessel.
- **Settings** — route-time vs. custom focus duration, interface sound,
  reduce motion, default vessel.
- **Local persistence** — everything (including an in-progress flight) lives
  in `localStorage`; close the tab mid-flight and the clock keeps running.
- **Procedural visuals** — planets are layered SVG gradients, starfields and
  the hyperspace tunnel are Canvas 2D, and ambience/jump/chime are WebAudio.
  The only bundled assets are the CC-BY ship models below.

## Running

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Dev shortcut

During a flight, press **Shift+D** to fast-forward to the last 15 seconds and
preview the approach/arrival sequence.

## Stack

- Next.js (App Router) + React 19 + TypeScript
- Tailwind CSS
- Framer Motion for transitions
- three.js for the 3D ship models (glTF)
- Canvas 2D for the starfield and hyperspace tunnel
- WebAudio for procedural sound
- `localStorage` for persistence

## Ship model credits

All ship models are Creative Commons Attribution (CC-BY) assets from
[poly.pizza](https://poly.pizza), bundled under `public/models/`:

- [X-Wing Fighter](https://poly.pizza/m/epzSsaO8Gfs) by Joe Scalise
- [Tie Fighter](https://poly.pizza/m/fGumBDR4AFk) by David O'Brien (-BlanK-)
- [Imperial Shuttle](https://poly.pizza/m/bPv3uoMsnUB) by Digi Factor Animation
- [Star Destroyer](https://poly.pizza/m/dl2aVTlVph1) by Joe Scalise
- [Speeder Bike](https://poly.pizza/m/1hTD6Jy384m) by Joe Scalise

Credits are also shown in-app under Settings → Model Credits.

## Structure

```
src/
  app/            # pages: home, /map, /flight, /log, /settings
  components/     # Starfield, Hyperspace, GalaxyMap, PlanetDisc, ShipSprite, Nav
  lib/
    data.ts       # planets, hyperspace lanes, ships (durations derived)
    graph.ts      # Dijkstra route-finding over the lane network
    store.tsx     # app state + localStorage persistence
    audio.ts      # procedural WebAudio ambience & effects
```
