// Projective (homography) mapping of an axis-aligned rectangle onto an
// arbitrary convex quadrilateral, returned as a CSS matrix3d() string. This
// lets a normal rectangular DOM element (an instrument panel) sit flush on a
// foreshortened cockpit screen with correct perspective, not just a skew.
//
// Adapted from the well-known 4-point CSS transform technique
// (Martin Kleppe / franklinta.com "computing css matrix3d transforms").

type Pt = [number, number];

function adj(m: number[]): number[] {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

function multmm(a: number[], b: number[]): number[] {
  const c = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = s;
    }
  return c;
}

function multmv(m: number[], v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(p: Pt[]): number[] {
  const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = multmv(adj(m), [p[3][0], p[3][1], 1]);
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

function general2DProjection(src: Pt[], dst: Pt[]): number[] {
  const s = basisToPoints(src);
  const d = basisToPoints(dst);
  return multmm(d, adj(s));
}

/**
 * matrix3d that maps a `w`×`h` box (transform-origin 0 0) onto `corners`,
 * given in clockwise order [topLeft, topRight, bottomRight, bottomLeft].
 */
export function quadMatrix3d(w: number, h: number, corners: Pt[]): string {
  const [tl, tr, br, bl] = corners;
  // basisToPoints wants order (p1, p2, p3, p4) = (TL, TR, BL, BR).
  const src: Pt[] = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  const dst: Pt[] = [tl, tr, bl, br];
  const t = general2DProjection(src, dst);
  for (let i = 0; i < 9; i++) t[i] = t[i] / t[8];
  const m = [
    t[0], t[3], 0, t[6],
    t[1], t[4], 0, t[7],
    0, 0, 1, 0,
    t[2], t[5], 0, t[8],
  ];
  return `matrix3d(${m.map((n) => n.toFixed(6)).join(",")})`;
}
