/**
 * GLB de logo: recorte pelo alfa + extrusão do contorno (volume contínuo).
 * Sem GPU — a imagem original fica nítida. Serve como asset de jogo.
 */

import { decodePngRgba } from "@/lib/capability-router/providers/logo-plate-png";
import { clampLogoThickness } from "@/lib/capability-router/providers/logo-plate-thickness";
import {
  closeAndSimplify,
  centroid,
  earclip,
  marchingSquaresLoops,
  pointInPoly,
  signedArea,
  type Vec2,
} from "@/lib/capability-router/providers/logo-plate-contour";

export {
  clampLogoThickness,
  logoThicknessFromLevel,
  LOGO_THICKNESS_DEFAULT,
  LOGO_THICKNESS_MAX,
  LOGO_THICKNESS_MIN,
} from "@/lib/capability-router/providers/logo-plate-thickness";

function padTo4(length: number): number {
  return (4 - (length % 4)) % 4;
}

export function imageMime(bytes: Uint8Array): "image/png" | "image/jpeg" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

const ALPHA_CUT = 16;
const MAX_GRID = 96;

function averageOpaqueRgb(rgba: Uint8Array): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3]! <= ALPHA_CUT) continue;
    r += rgba[i]!;
    g += rgba[i + 1]!;
    b += rgba[i + 2]!;
    n += 1;
  }
  if (n === 0) return [0.18, 0.18, 0.2];
  return [(r / n / 255) * 0.82, (g / n / 255) * 0.82, (b / n / 255) * 0.82];
}

function packGlb(json: unknown, bin: Uint8Array): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadding = padTo4(jsonBytes.length);
  const jsonChunkLength = jsonBytes.length + jsonPadding;
  const binPadding = padTo4(bin.length);
  const binChunkLength = bin.length + binPadding;
  const total = 12 + 8 + jsonChunkLength + 8 + binChunkLength;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonChunkLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonChunkLength);
  const binHeader = 20 + jsonChunkLength;
  view.setUint32(binHeader, binChunkLength, true);
  view.setUint32(binHeader + 4, 0x004e4942, true);
  out.set(bin, binHeader + 8);
  return out;
}

function pushQuad(
  positions: number[],
  uvs: number[],
  indices: number[],
  corners: number[][],
  uvCorners: number[][],
) {
  const base = positions.length / 3;
  for (const c of corners) positions.push(c[0]!, c[1]!, c[2]!);
  for (const u of uvCorners) uvs.push(u[0]!, u[1]!);
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function pushTri(
  positions: number[],
  uvs: number[],
  indices: number[],
  corners: number[][],
  uvCorners: number[][],
) {
  const base = positions.length / 3;
  for (const c of corners) positions.push(c[0]!, c[1]!, c[2]!);
  for (const u of uvCorners) uvs.push(u[0]!, u[1]!);
  indices.push(base, base + 1, base + 2);
}

export function buildLogoPlateGlb(
  imageBytes: Uint8Array,
  options?: { thickness?: unknown },
): Uint8Array {
  const thickness = clampLogoThickness(options?.thickness);
  const mime = imageMime(imageBytes);
  if (!mime) {
    throw new Error("Logo exige PNG ou JPEG");
  }

  if (mime === "image/png") {
    try {
      return buildCutoutGlb(imageBytes, thickness);
    } catch {
      /* PNG atípico: cai no retângulo com alpha */
    }
  }

  return buildTexturedRect(imageBytes, mime, true, thickness);
}

function sampleAlpha(
  rgba: Uint8Array,
  width: number,
  height: number,
  gx: number,
  gy: number,
  gw: number,
  gh: number,
): number {
  const sx = Math.min(width - 1, Math.max(0, Math.round((gx / gw) * (width - 1))));
  const sy = Math.min(height - 1, Math.max(0, Math.round((gy / gh) * (height - 1))));
  return rgba[(sy * width + sx) * 4 + 3]! / 255;
}

function buildCutoutGlb(imageBytes: Uint8Array, thickness: number): Uint8Array {
  const { width, height, rgba } = decodePngRgba(imageBytes);
  const scale = Math.min(1, MAX_GRID / Math.max(width, height));
  const gw = Math.max(2, Math.round(width * scale));
  const gh = Math.max(2, Math.round(height * scale));

  let any = false;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i]! > ALPHA_CUT) {
      any = true;
      break;
    }
  }
  if (!any) return buildTexturedRect(imageBytes, "image/png", true, thickness);

  const field = Array.from({ length: gh + 1 }, (_, y) =>
    Array.from({ length: gw + 1 }, (__, x) =>
      sampleAlpha(rgba, width, height, x, y, gw, gh),
    ),
  );

  let loops = marchingSquaresLoops(field).map((loop) =>
    closeAndSimplify(loop, 0.35),
  );
  loops = loops.filter((loop) => loop.length >= 3);

  if (loops.length === 0) {
    loops = [
      [
        [0, 0],
        [gw, 0],
        [gw, gh],
        [0, gh],
      ],
    ];
  }

  const aspect = width / height;
  const worldW = aspect >= 1 ? 1 : aspect;
  const worldH = aspect >= 1 ? 1 / aspect : 1;
  const z = thickness / 2;

  const toWorld = (p: Vec2): Vec2 => [
    -worldW / 2 + (p[0] / gw) * worldW,
    worldH / 2 - (p[1] / gh) * worldH,
  ];
  const toUv = (p: Vec2): Vec2 => [p[0] / gw, p[1] / gh];

  const ranked = loops
    .map((grid) => {
      const world = grid.map(toWorld);
      const area = signedArea(world);
      return { grid, world, area: Math.abs(area), cw: area < 0 };
    })
    .sort((a, b) => b.area - a.area);

  const islands: typeof ranked = [];
  const holes: typeof ranked = [];
  for (const ring of ranked) {
    const c = centroid(ring.world);
    const parent = islands.find((outer) => pointInPoly(c, outer.world));
    if (parent) holes.push(ring);
    else islands.push(ring);
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const insetUv = (p: Vec2, c: Vec2, intoSolid: boolean): Vec2 => {
    const dx = c[0] - p[0];
    const dy = c[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const step = Math.min(len * 0.18, 1.5);
    const s = intoSolid ? 1 : -1;
    return toUv([p[0] + s * (dx / len) * step, p[1] + s * (dy / len) * step]);
  };

  const extrudeRing = (grid: Vec2[], intoSolid: boolean) => {
    let g = grid.slice();
    let w = g.map(toWorld);
    if (signedArea(w) < 0) {
      g = g.slice().reverse();
      w = w.slice().reverse();
    }
    const c = centroid(g);
    for (let i = 0; i < g.length; i += 1) {
      const j = (i + 1) % g.length;
      const p = w[i]!;
      const q = w[j]!;
      const up = insetUv(g[i]!, c, intoSolid);
      const uq = insetUv(g[j]!, c, intoSolid);
      pushQuad(
        positions,
        uvs,
        indices,
        [
          [p[0], p[1], z],
          [q[0], q[1], z],
          [q[0], q[1], -z],
          [p[0], p[1], -z],
        ],
        [up, uq, uq, up],
      );
    }
  };

  let caps = 0;
  for (const island of islands) {
    let g = island.grid.slice();
    let w = g.map(toWorld);
    if (signedArea(w) < 0) {
      g = g.slice().reverse();
      w = w.slice().reverse();
    }
    const tris = earclip(w);
    if (tris.length === 0) continue;
    caps += tris.length;
    const uvOf = (pt: Vec2): Vec2 => {
      const k = w.findIndex(
        (q) => Math.abs(q[0] - pt[0]) < 1e-7 && Math.abs(q[1] - pt[1]) < 1e-7,
      );
      return k >= 0 ? toUv(g[k]!) : [0.5, 0.5];
    };
    for (const tri of tris) {
      const a = tri[0]!;
      const b = tri[1]!;
      const c = tri[2]!;
      const ua = uvOf(a);
      const ub = uvOf(b);
      const uc = uvOf(c);
      pushTri(
        positions,
        uvs,
        indices,
        [
          [a[0], a[1], z],
          [b[0], b[1], z],
          [c[0], c[1], z],
        ],
        [ua, ub, uc],
      );
      pushTri(
        positions,
        uvs,
        indices,
        [
          [a[0], a[1], -z],
          [c[0], c[1], -z],
          [b[0], b[1], -z],
        ],
        [ua, uc, ub],
      );
    }
  }

  const wallIndexStart = indices.length;
  for (const ring of islands) extrudeRing(ring.grid, true);
  for (const ring of holes) extrudeRing(ring.grid, false);

  if (caps === 0 || positions.length < 9) {
    return buildVoxelCutout(imageBytes, thickness, width, height, rgba);
  }

  return finishMesh(positions, uvs, indices, imageBytes, "image/png", false, {
    rimColor: averageOpaqueRgb(rgba),
    wallIndexStart,
  });
}

function buildVoxelCutout(
  imageBytes: Uint8Array,
  thickness: number,
  width: number,
  height: number,
  rgba: Uint8Array,
): Uint8Array {
  const scale = Math.min(1, 64 / Math.max(width, height));
  const gw = Math.max(1, Math.round(width * scale));
  const gh = Math.max(1, Math.round(height * scale));
  const solid = Array.from({ length: gh }, () => Array<boolean>(gw).fill(false));
  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) * width) / gw));
      const sy = Math.min(height - 1, Math.floor(((y + 0.5) * height) / gh));
      solid[y]![x] = rgba[(sy * width + sx) * 4 + 3]! > ALPHA_CUT;
    }
  }
  const aspect = width / height;
  const worldW = aspect >= 1 ? 1 : aspect;
  const worldH = aspect >= 1 ? 1 / aspect : 1;
  const cellW = worldW / gw;
  const cellH = worldH / gh;
  const z = thickness / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const occupied = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < gw && y < gh && Boolean(solid[y]![x]);

  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      if (!solid[y]![x]) continue;
      const x0 = -worldW / 2 + x * cellW;
      const x1 = x0 + cellW;
      const y0 = worldH / 2 - (y + 1) * cellH;
      const y1 = y0 + cellH;
      const u0 = x / gw;
      const u1 = (x + 1) / gw;
      const v0 = (y + 1) / gh;
      const v1 = y / gh;
      pushQuad(
        positions,
        uvs,
        indices,
        [
          [x0, y0, z],
          [x1, y0, z],
          [x1, y1, z],
          [x0, y1, z],
        ],
        [
          [u0, v0],
          [u1, v0],
          [u1, v1],
          [u0, v1],
        ],
      );
      pushQuad(
        positions,
        uvs,
        indices,
        [
          [x0, y0, -z],
          [x0, y1, -z],
          [x1, y1, -z],
          [x1, y0, -z],
        ],
        [
          [u0, v0],
          [u0, v1],
          [u1, v1],
          [u1, v0],
        ],
      );
      if (!occupied(x, y + 1)) {
        pushQuad(positions, uvs, indices, [
          [x0, y0, z],
          [x0, y0, -z],
          [x1, y0, -z],
          [x1, y0, z],
        ], [[u0, v0], [u0, v0], [u1, v0], [u1, v0]]);
      }
      if (!occupied(x, y - 1)) {
        pushQuad(positions, uvs, indices, [
          [x0, y1, z],
          [x1, y1, z],
          [x1, y1, -z],
          [x0, y1, -z],
        ], [[u0, v1], [u1, v1], [u1, v1], [u0, v1]]);
      }
      if (!occupied(x - 1, y)) {
        pushQuad(positions, uvs, indices, [
          [x0, y0, z],
          [x0, y1, z],
          [x0, y1, -z],
          [x0, y0, -z],
        ], [[u0, v0], [u0, v1], [u0, v1], [u0, v0]]);
      }
      if (!occupied(x + 1, y)) {
        pushQuad(positions, uvs, indices, [
          [x1, y0, z],
          [x1, y0, -z],
          [x1, y1, -z],
          [x1, y1, z],
        ], [[u1, v0], [u1, v0], [u1, v1], [u1, v1]]);
      }
    }
  }
  return finishMesh(positions, uvs, indices, imageBytes, "image/png", false, {
    rimColor: averageOpaqueRgb(rgba),
  });
}

function buildTexturedRect(
  imageBytes: Uint8Array,
  mime: "image/png" | "image/jpeg",
  withAlpha: boolean,
  thickness: number,
): Uint8Array {
  const z = thickness / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  pushQuad(
    positions,
    uvs,
    indices,
    [
      [-0.5, -0.5, z],
      [0.5, -0.5, z],
      [0.5, 0.5, z],
      [-0.5, 0.5, z],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  );
  pushQuad(
    positions,
    uvs,
    indices,
    [
      [-0.5, -0.5, -z],
      [-0.5, 0.5, -z],
      [0.5, 0.5, -z],
      [0.5, -0.5, -z],
    ],
    [
      [0, 1],
      [0, 0],
      [1, 0],
      [1, 1],
    ],
  );
  const rim: Array<{ c: number[][]; uv: number[][] }> = [
    {
      c: [
        [-0.5, -0.5, z],
        [-0.5, -0.5, -z],
        [0.5, -0.5, -z],
        [0.5, -0.5, z],
      ],
      uv: [
        [0, 1],
        [0, 1],
        [1, 1],
        [1, 1],
      ],
    },
    {
      c: [
        [-0.5, 0.5, z],
        [0.5, 0.5, z],
        [0.5, 0.5, -z],
        [-0.5, 0.5, -z],
      ],
      uv: [
        [0, 0],
        [1, 0],
        [1, 0],
        [0, 0],
      ],
    },
    {
      c: [
        [-0.5, -0.5, z],
        [-0.5, 0.5, z],
        [-0.5, 0.5, -z],
        [-0.5, -0.5, -z],
      ],
      uv: [
        [0, 1],
        [0, 0],
        [0, 0],
        [0, 1],
      ],
    },
    {
      c: [
        [0.5, -0.5, z],
        [0.5, -0.5, -z],
        [0.5, 0.5, -z],
        [0.5, 0.5, z],
      ],
      uv: [
        [1, 1],
        [1, 1],
        [1, 0],
        [1, 0],
      ],
    },
  ];
  for (const side of rim) {
    pushQuad(positions, uvs, indices, side.c, side.uv);
  }
  return finishMesh(positions, uvs, indices, imageBytes, mime, withAlpha);
}

function computeNormals(
  pos: Float32Array,
  indices: Uint16Array | Uint32Array,
): Float32Array {
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i]! * 3;
    const ib = indices[i + 1]! * 3;
    const ic = indices[i + 2]! * 3;
    const ax = pos[ib]! - pos[ia]!;
    const ay = pos[ib + 1]! - pos[ia + 1]!;
    const az = pos[ib + 2]! - pos[ia + 2]!;
    const bx = pos[ic]! - pos[ia]!;
    const by = pos[ic + 1]! - pos[ia + 1]!;
    const bz = pos[ic + 2]! - pos[ia + 2]!;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    nrm[ia]! += nx;
    nrm[ia + 1]! += ny;
    nrm[ia + 2]! += nz;
    nrm[ib]! += nx;
    nrm[ib + 1]! += ny;
    nrm[ib + 2]! += nz;
    nrm[ic]! += nx;
    nrm[ic + 1]! += ny;
    nrm[ic + 2]! += nz;
  }
  for (let i = 0; i < nrm.length; i += 3) {
    const x = nrm[i]!;
    const y = nrm[i + 1]!;
    const z = nrm[i + 2]!;
    const len = Math.hypot(x, y, z) || 1;
    nrm[i] = x / len;
    nrm[i + 1] = y / len;
    nrm[i + 2] = z / len;
  }
  return nrm;
}

function finishMesh(
  positions: number[] | Float32Array,
  uvs: number[] | Float32Array,
  indices: number[] | Uint16Array | Uint32Array,
  imageBytes: Uint8Array,
  mime: "image/png" | "image/jpeg",
  withAlpha = true,
  extras?: {
    rimColor?: [number, number, number];
    wallIndexStart?: number;
  },
): Uint8Array {
  const pos = positions instanceof Float32Array ? positions : new Float32Array(positions);
  const uv = uvs instanceof Float32Array ? uvs : new Float32Array(uvs);
  const maxIndex = indices instanceof Uint16Array || indices instanceof Uint32Array
    ? Math.max(0, ...Array.from(indices))
    : Math.max(0, ...indices);
  const indexArray =
    maxIndex > 65535
      ? indices instanceof Uint32Array
        ? indices
        : new Uint32Array(indices)
      : indices instanceof Uint16Array
        ? indices
        : new Uint16Array(indices);
  const nrm = computeNormals(pos, indexArray);
  const indexBytes = new Uint8Array(indexArray.buffer, indexArray.byteOffset, indexArray.byteLength);
  const posBytes = new Uint8Array(pos.buffer, pos.byteOffset, pos.byteLength);
  const nrmBytes = new Uint8Array(nrm.buffer, nrm.byteOffset, nrm.byteLength);
  const uvBytes = new Uint8Array(uv.buffer, uv.byteOffset, uv.byteLength);

  let offset = 0;
  const indexOff = offset;
  offset += indexBytes.length + padTo4(indexBytes.length);
  const posOff = offset;
  offset += posBytes.length + padTo4(posBytes.length);
  const nrmOff = offset;
  offset += nrmBytes.length + padTo4(nrmBytes.length);
  const uvOff = offset;
  offset += uvBytes.length + padTo4(uvBytes.length);
  const imgOff = offset;
  offset += imageBytes.length + padTo4(imageBytes.length);

  const bin = new Uint8Array(offset);
  bin.set(indexBytes, indexOff);
  bin.set(posBytes, posOff);
  bin.set(nrmBytes, nrmOff);
  bin.set(uvBytes, uvOff);
  bin.set(imageBytes, imgOff);

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    minX = Math.min(minX, pos[i]!);
    minY = Math.min(minY, pos[i + 1]!);
    minZ = Math.min(minZ, pos[i + 2]!);
    maxX = Math.max(maxX, pos[i]!);
    maxY = Math.max(maxY, pos[i + 1]!);
    maxZ = Math.max(maxZ, pos[i + 2]!);
  }

  const indexComponent = indexArray instanceof Uint32Array ? 5125 : 5123;
  const indexStride = indexArray instanceof Uint32Array ? 4 : 2;
  const vertCount = pos.length / 3;
  const wallStart = extras?.wallIndexStart;
  const splitWalls =
    Boolean(extras?.rimColor) &&
    typeof wallStart === "number" &&
    wallStart > 0 &&
    wallStart < indexArray.length &&
    wallStart % 3 === 0;

  const faceMaterial = {
    pbrMetallicRoughness: {
      baseColorTexture: { index: 0 },
      metallicFactor: 0.05,
      roughnessFactor: 0.45,
    },
    alphaMode: withAlpha ? "MASK" : "OPAQUE",
    alphaCutoff: 0.08,
    doubleSided: true,
  };
  const rimMaterial = extras?.rimColor
    ? {
        pbrMetallicRoughness: {
          baseColorFactor: [...extras.rimColor, 1],
          metallicFactor: 0.22,
          roughnessFactor: 0.38,
        },
        alphaMode: "OPAQUE",
        doubleSided: true,
      }
    : null;

  const primitives = splitWalls
    ? [
        {
          attributes: { POSITION: 1, NORMAL: 2, TEXCOORD_0: 3 },
          indices: 0,
          material: 0,
        },
        {
          attributes: { POSITION: 1, NORMAL: 2 },
          indices: 4,
          material: 1,
        },
      ]
    : [
        {
          attributes: { POSITION: 1, NORMAL: 2, TEXCOORD_0: 3 },
          indices: 0,
          material: 0,
        },
      ];

  const accessors: Array<Record<string, unknown>> = [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: indexComponent,
      count: splitWalls ? wallStart : indexArray.length,
      type: "SCALAR",
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: vertCount,
      type: "VEC3",
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    },
    {
      bufferView: 2,
      componentType: 5126,
      count: vertCount,
      type: "VEC3",
    },
    {
      bufferView: 3,
      componentType: 5126,
      count: vertCount,
      type: "VEC2",
    },
  ];
  if (splitWalls && wallStart) {
    accessors.push({
      bufferView: 0,
      byteOffset: wallStart * indexStride,
      componentType: indexComponent,
      count: indexArray.length - wallStart,
      type: "SCALAR",
    });
  }

  const json = {
    asset: { version: "2.0", generator: "x09-studio-logo-plate" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives }],
    materials: rimMaterial && splitWalls ? [faceMaterial, rimMaterial] : [faceMaterial],
    images: [{ mimeType: mime, bufferView: 4 }],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 }],
    accessors,
    bufferViews: [
      {
        buffer: 0,
        byteOffset: indexOff,
        byteLength: indexBytes.length,
        target: 34963,
      },
      {
        buffer: 0,
        byteOffset: posOff,
        byteLength: posBytes.length,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: nrmOff,
        byteLength: nrmBytes.length,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: uvOff,
        byteLength: uvBytes.length,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: imgOff,
        byteLength: imageBytes.length,
      },
    ],
    buffers: [{ byteLength: bin.length }],
  };

  return packGlb(json, bin);
}
