import { isGlbMagic } from "@/lib/capability-router/providers/fake-mesh-glb";

export const IDLE_MOTION_NAME = "x09-idle";

type GltfJson = Record<string, unknown> & {
  scene?: number;
  scenes?: { nodes?: number[] }[];
  nodes?: { children?: number[]; name?: string }[];
  accessors?: {
    bufferView?: number;
    componentType?: number;
    count?: number;
    type?: string;
    min?: number[];
    max?: number[];
  }[];
  buffers?: { byteLength: number; uri?: string }[];
  bufferViews?: { buffer?: number; byteOffset?: number; byteLength?: number }[];
  animations?: Record<string, unknown>[];
};

function padTo4(length: number): number {
  return (4 - (length % 4)) % 4;
}

function quatYaw(radians: number): [number, number, number, number] {
  const half = radians / 2;
  return [0, Math.sin(half), 0, Math.cos(half)];
}

export function parseGlb(bytes: Uint8Array): { json: GltfJson; bin: Uint8Array } {
  if (!isGlbMagic(bytes) || bytes.length < 20) {
    throw new Error("O arquivo não é um GLB válido.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let json: GltfJson | null = null;
  let bin = new Uint8Array(0);
  while (offset + 8 <= bytes.length) {
    const chunkLen = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + chunkLen;
    if (end > bytes.length) break;
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(
        new TextDecoder().decode(bytes.subarray(start, end)),
      ) as GltfJson;
    } else if (chunkType === 0x004e4942) {
      bin = bytes.subarray(start, end);
    }
    offset = end;
  }
  if (!json) throw new Error("GLB sem descrição do modelo.");
  return { json, bin };
}

export function packGlb(json: GltfJson, bin: Uint8Array): Uint8Array {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = padTo4(jsonBytes.length);
  const jsonChunk = jsonBytes.length + jsonPad;
  const binPad = padTo4(bin.length);
  const binChunk = bin.length + binPad;
  const total = 12 + 8 + jsonChunk + 8 + binChunk;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonChunk, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonChunk);
  const binHeader = 20 + jsonChunk;
  view.setUint32(binHeader, binChunk, true);
  view.setUint32(binHeader + 4, 0x004e4942, true);
  out.set(bin, binHeader + 8);
  return out;
}

function amplitudeFromBounds(json: GltfJson): number {
  let height = 0;
  for (const accessor of json.accessors ?? []) {
    if (accessor.type !== "VEC3" || !accessor.min || !accessor.max) continue;
    const minY = accessor.min[1];
    const maxY = accessor.max[1];
    if (typeof minY === "number" && typeof maxY === "number") {
      height = Math.max(height, maxY - minY);
    }
  }
  if (height <= 0) return 0.045;
  return Math.min(0.18, Math.max(0.02, height * 0.035));
}

function rootNodes(json: GltfJson): number[] {
  const scene = json.scenes?.[json.scene ?? 0];
  if (scene?.nodes?.length) return scene.nodes;
  const children = new Set<number>();
  for (const node of json.nodes ?? []) {
    for (const child of node.children ?? []) children.add(child);
  }
  return (json.nodes ?? [])
    .map((_, index) => index)
    .filter((index) => !children.has(index));
}

export function glbHasIdleMotion(bytes: Uint8Array): boolean {
  try {
    const { json } = parseGlb(bytes);
    return (json.animations ?? []).some((anim) => anim.name === IDLE_MOTION_NAME);
  } catch {
    return false;
  }
}

/** Acrescenta um idle em loop (sobe/desce + leve giro) sem mexer na malha. */
export function injectIdleMotion(bytes: Uint8Array): Uint8Array {
  const { json, bin } = parseGlb(bytes);
  if ((json.animations ?? []).some((anim) => anim.name === IDLE_MOTION_NAME)) {
    return bytes;
  }
  if (json.buffers?.some((buffer) => buffer.uri)) {
    throw new Error("Este GLB usa buffers externos e não pode ganhar movimento aqui.");
  }

  json.nodes = json.nodes ?? [];
  json.scenes = json.scenes ?? [{ nodes: [] }];
  if (json.scene == null) json.scene = 0;
  const roots = rootNodes(json);
  if (roots.length === 0) {
    throw new Error("O objeto 3D não tem nós para animar.");
  }

  const wrapper = json.nodes.length;
  json.nodes.push({ name: IDLE_MOTION_NAME, children: roots });
  json.scenes[json.scene] = { ...json.scenes[json.scene], nodes: [wrapper] };

  const amp = amplitudeFromBounds(json);
  const times = new Float32Array([0, 0.5, 1, 1.5, 2]);
  const translations = new Float32Array([
    0, 0, 0, 0, amp, 0, 0, 0, 0, 0, -amp * 0.35, 0, 0, 0, 0,
  ]);
  const yaw = 0.07;
  const rotations = new Float32Array([
    ...quatYaw(0),
    ...quatYaw(yaw),
    ...quatYaw(0),
    ...quatYaw(-yaw),
    ...quatYaw(0),
  ]);

  const timeBytes = new Uint8Array(times.buffer);
  const transBytes = new Uint8Array(translations.buffer);
  const rotBytes = new Uint8Array(rotations.buffer);
  const start = bin.length + padTo4(bin.length);
  const transOff = start + timeBytes.length;
  const rotOff = transOff + transBytes.length;
  const newBin = new Uint8Array(rotOff + rotBytes.length);
  newBin.set(bin, 0);
  newBin.set(timeBytes, start);
  newBin.set(transBytes, transOff);
  newBin.set(rotBytes, rotOff);

  json.buffers = json.buffers?.length
    ? [{ ...json.buffers[0], byteLength: newBin.length }]
    : [{ byteLength: newBin.length }];
  json.bufferViews = json.bufferViews ?? [];
  json.accessors = json.accessors ?? [];
  json.animations = json.animations ?? [];

  const timeView = json.bufferViews.length;
  json.bufferViews.push({
    buffer: 0,
    byteOffset: start,
    byteLength: timeBytes.length,
  });
  const transView = json.bufferViews.length;
  json.bufferViews.push({
    buffer: 0,
    byteOffset: transOff,
    byteLength: transBytes.length,
  });
  const rotView = json.bufferViews.length;
  json.bufferViews.push({
    buffer: 0,
    byteOffset: rotOff,
    byteLength: rotBytes.length,
  });

  const timeAcc = json.accessors.length;
  json.accessors.push({
    bufferView: timeView,
    componentType: 5126,
    count: times.length,
    type: "SCALAR",
    min: [0],
    max: [2],
  });
  const transAcc = json.accessors.length;
  json.accessors.push({
    bufferView: transView,
    componentType: 5126,
    count: 5,
    type: "VEC3",
  });
  const rotAcc = json.accessors.length;
  json.accessors.push({
    bufferView: rotView,
    componentType: 5126,
    count: 5,
    type: "VEC4",
  });

  json.animations.push({
    name: IDLE_MOTION_NAME,
    samplers: [
      { input: timeAcc, interpolation: "LINEAR", output: transAcc },
      { input: timeAcc, interpolation: "LINEAR", output: rotAcc },
    ],
    channels: [
      { sampler: 0, target: { node: wrapper, path: "translation" } },
      { sampler: 1, target: { node: wrapper, path: "rotation" } },
    ],
  });

  return packGlb(json, newBin);
}
