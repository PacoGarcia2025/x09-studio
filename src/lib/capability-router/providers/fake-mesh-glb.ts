/**
 * GLB mínimo (um triângulo). Sem modelos, sem GPU — só bytes válidos
 * para o Studio gravar e servir o arquivo.
 */

function padTo4(length: number): number {
  return (4 - (length % 4)) % 4;
}

export function buildFakeMeshGlb(): Uint8Array {
  const indices = new Uint16Array([0, 1, 2]);
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]);

  const bin = new Uint8Array(44);
  bin.set(new Uint8Array(indices.buffer), 0);
  bin.set(new Uint8Array(positions.buffer), 8);

  const json = JSON.stringify({
    asset: { version: "2.0", generator: "x09-studio-fake-mesh" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [{ attributes: { POSITION: 1 }, indices: 0 }],
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5123,
        count: 3,
        type: "SCALAR",
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 6, target: 34963 },
      { buffer: 0, byteOffset: 8, byteLength: 36, target: 34962 },
    ],
    buffers: [{ byteLength: 44 }],
  });

  const jsonBytes = new TextEncoder().encode(json);
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

export function isGlbMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return (
    bytes[0] === 0x67 &&
    bytes[1] === 0x6c &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46
  );
}
