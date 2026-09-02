/**
 * Contorno suave da máscara alfa → anéis para extrusão.
 * Sem dependências (marching squares + ear clipping).
 */

export type Vec2 = [number, number];

const ISO = 16 / 255;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interp(
  x0: number,
  y0: number,
  v0: number,
  x1: number,
  y1: number,
  v1: number,
): Vec2 {
  const t = Math.abs(v1 - v0) < 1e-8 ? 0.5 : (ISO - v0) / (v1 - v0);
  const u = Math.min(1, Math.max(0, t));
  return [lerp(x0, x1, u), lerp(y0, y1, u)];
}

function pointKey(p: Vec2): string {
  return `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
}

/**
 * Campo escalar (alfa 0–1) em cantos [gy+1][gx+1].
 * Devolve anéis em coordenadas de grelha (x→direita, y→baixo).
 */
export function marchingSquaresLoops(field: number[][]): Vec2[][] {
  const gh = field.length - 1;
  const gw = field[0]!.length - 1;
  const segs: Array<{ a: Vec2; b: Vec2 }> = [];

  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      const tl = field[y]![x]!;
      const tr = field[y]![x + 1]!;
      const br = field[y + 1]![x + 1]!;
      const bl = field[y + 1]![x]!;
      let idx = 0;
      if (tl >= ISO) idx |= 1;
      if (tr >= ISO) idx |= 2;
      if (br >= ISO) idx |= 4;
      if (bl >= ISO) idx |= 8;
      if (idx === 0 || idx === 15) continue;

      const top = interp(x, y, tl, x + 1, y, tr);
      const right = interp(x + 1, y, tr, x + 1, y + 1, br);
      const bottom = interp(x, y + 1, bl, x + 1, y + 1, br);
      const left = interp(x, y, tl, x, y + 1, bl);

      const add = (a: Vec2, b: Vec2) => {
        segs.push({ a, b });
      };

      switch (idx) {
        case 1:
        case 14:
          add(left, top);
          break;
        case 2:
        case 13:
          add(top, right);
          break;
        case 3:
        case 12:
          add(left, right);
          break;
        case 4:
        case 11:
          add(right, bottom);
          break;
        case 5:
          add(left, top);
          add(right, bottom);
          break;
        case 6:
        case 9:
          add(top, bottom);
          break;
        case 7:
        case 8:
          add(left, bottom);
          break;
        case 10:
          add(top, right);
          add(left, bottom);
          break;
        default:
          break;
      }
    }
  }

  return stitch(segs);
}

function stitch(segs: Array<{ a: Vec2; b: Vec2 }>): Vec2[][] {
  const unused = segs.slice();
  const loops: Vec2[][] = [];

  while (unused.length > 0) {
    const first = unused.pop()!;
    const loop: Vec2[] = [first.a, first.b];
    let guard = unused.length + 2;
    while (guard > 0) {
      guard -= 1;
      const tail = loop[loop.length - 1]!;
      const tk = pointKey(tail);
      const hit = unused.findIndex(
        (s) => pointKey(s.a) === tk || pointKey(s.b) === tk,
      );
      if (hit < 0) break;
      const [seg] = unused.splice(hit, 1);
      if (!seg) break;
      const next = pointKey(seg.a) === tk ? seg.b : seg.a;
      if (pointKey(next) === pointKey(loop[0]!)) break;
      loop.push(next);
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

export function signedArea(poly: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const j = (i + 1) % poly.length;
    a += poly[i]![0]! * poly[j]![1]! - poly[j]![0]! * poly[i]![1]!;
  }
  return a / 2;
}

function distToSeg(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) {
    const qx = p[0] - a[0];
    const qy = p[1] - a[1];
    return Math.hypot(qx, qy);
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function simplifyRdp(poly: Vec2[], epsilon: number): Vec2[] {
  if (poly.length <= 3) return poly;
  let maxD = 0;
  let maxI = 0;
  const first = poly[0]!;
  const last = poly[poly.length - 1]!;
  for (let i = 1; i < poly.length - 1; i += 1) {
    const d = distToSeg(poly[i]!, first, last);
    if (d > maxD) {
      maxD = d;
      maxI = i;
    }
  }
  if (maxD <= epsilon) return [first, last];
  const left = simplifyRdp(poly.slice(0, maxI + 1), epsilon);
  const right = simplifyRdp(poly.slice(maxI), epsilon);
  return left.slice(0, -1).concat(right);
}

export function closeAndSimplify(loop: Vec2[], epsilon: number): Vec2[] {
  const raw =
    pointKey(loop[0]!) === pointKey(loop[loop.length - 1]!)
      ? loop.slice(0, -1)
      : loop.slice();
  if (raw.length < 3) return raw;
  const simplified = simplifyRdp(raw.concat([raw[0]!]), epsilon);
  if (
    simplified.length >= 2 &&
    pointKey(simplified[0]!) === pointKey(simplified[simplified.length - 1]!)
  ) {
    simplified.pop();
  }
  return simplified.length >= 3 ? simplified : raw;
}

function isConvexEar(prev: Vec2, cur: Vec2, next: Vec2, ccw: boolean): boolean {
  const cross =
    (cur[0] - prev[0]) * (next[1] - prev[1]) -
    (cur[1] - prev[1]) * (next[0] - prev[0]);
  return ccw ? cross > 1e-10 : cross < -1e-10;
}

function pointInTri(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  const v0x = c[0] - a[0];
  const v0y = c[1] - a[1];
  const v1x = b[0] - a[0];
  const v1y = b[1] - a[1];
  const v2x = p[0] - a[0];
  const v2y = p[1] - a[1];
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const inv = 1 / (dot00 * dot11 - dot01 * dot01 || 1);
  const u = (dot11 * dot02 - dot01 * dot12) * inv;
  const v = (dot00 * dot12 - dot01 * dot02) * inv;
  return u >= 0 && v >= 0 && u + v < 1;
}

/** Triângulos (triplos de pontos) para um anel simples, sem buracos. */
export function earclip(poly: Vec2[]): Vec2[][] {
  const verts = poly.map((p) => [p[0], p[1]] as Vec2);
  if (verts.length < 3) return [];
  const ccw = signedArea(verts) > 0;
  const tris: Vec2[][] = [];
  const idx = verts.map((_, i) => i);
  let guard = verts.length * verts.length;
  while (idx.length > 3 && guard > 0) {
    guard -= 1;
    let clipped = false;
    for (let i = 0; i < idx.length; i += 1) {
      const i0 = idx[(i + idx.length - 1) % idx.length]!;
      const i1 = idx[i]!;
      const i2 = idx[(i + 1) % idx.length]!;
      const a = verts[i0]!;
      const b = verts[i1]!;
      const c = verts[i2]!;
      if (!isConvexEar(a, b, c, ccw)) continue;
      let inside = false;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (pointInTri(verts[j]!, a, b, c)) {
          inside = true;
          break;
        }
      }
      if (inside) continue;
      tris.push([a, b, c]);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) {
    tris.push([verts[idx[0]!]!, verts[idx[1]!]!, verts[idx[2]!]!]);
  }
  return tris;
}

export function pointInPoly(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i]![0]!;
    const yi = poly[i]![1]!;
    const xj = poly[j]![0]!;
    const yj = poly[j]![1]!;
    const hit =
      yi > p[1] !== yj > p[1] &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function centroid(poly: Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p[0];
    y += p[1];
  }
  const n = poly.length || 1;
  return [x / n, y / n];
}
