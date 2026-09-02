import { inflateSync } from "node:zlib";

export type DecodedPng = {
  width: number;
  height: number;
  rgba: Uint8Array;
};

function u32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! << 24) |
    (bytes[offset + 1]! << 16) |
    (bytes[offset + 2]! << 8) |
    bytes[offset + 3]!
  ) >>> 0;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(
  data: Uint8Array,
  width: number,
  height: number,
  bytesPerPixel: number,
): Uint8Array {
  const stride = width * bytesPerPixel;
  const rowBytes = stride + 1;
  if (data.length < height * rowBytes) {
    throw new Error("PNG dados incompletos");
  }
  const out = new Uint8Array(stride * height);
  let src = 0;
  let dst = 0;
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const type = data[src]!;
    src += 1;
    const row = data.subarray(src, src + stride);
    src += stride;
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const raw = row[i]!;
      const left = i >= bytesPerPixel ? cur[i - bytesPerPixel]! : 0;
      const up = prev[i]!;
      const upLeft = i >= bytesPerPixel ? prev[i - bytesPerPixel]! : 0;
      if (type === 0) cur[i] = raw;
      else if (type === 1) cur[i] = (raw + left) & 255;
      else if (type === 2) cur[i] = (raw + up) & 255;
      else if (type === 3) cur[i] = (raw + ((left + up) >> 1)) & 255;
      else if (type === 4) cur[i] = (raw + paeth(left, up, upLeft)) & 255;
      else throw new Error("PNG filtro não suportado");
    }
    out.set(cur, dst);
    dst += stride;
    prev = cur;
  }
  return out;
}

/**
 * PNG 8-bit RGB / RGBA / cinza+alfa → RGBA. Sem dependências.
 */
export function decodePngRgba(bytes: Uint8Array): DecodedPng {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
    throw new Error("PNG inválido");
  }
  let i = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats: Uint8Array[] = [];
  while (i + 12 <= bytes.length) {
    const len = u32(bytes, i);
    const type = String.fromCharCode(
      bytes[i + 4]!,
      bytes[i + 5]!,
      bytes[i + 6]!,
      bytes[i + 7]!,
    );
    const data = bytes.subarray(i + 8, i + 8 + len);
    if (type === "IHDR") {
      width = u32(data, 0);
      height = u32(data, 4);
      bitDepth = data[8]!;
      colorType = data[9]!;
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type === "IEND") {
      break;
    }
    i += 12 + len;
  }
  if (!width || !height || bitDepth !== 8) {
    throw new Error("PNG tem de ser 8-bit");
  }
  if (colorType !== 2 && colorType !== 4 && colorType !== 6) {
    throw new Error("PNG tem de ser RGB ou RGBA");
  }

  const joined = new Uint8Array(idats.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const chunk of idats) {
    joined.set(chunk, o);
    o += chunk.length;
  }
  const inflated = inflateSync(joined);
  const bpp = colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  const raw = unfilter(inflated, width, height, bpp);
  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p += 1) {
    const d = p * 4;
    if (colorType === 6) {
      rgba.set(raw.subarray(p * 4, p * 4 + 4), d);
    } else if (colorType === 2) {
      rgba[d] = raw[p * 3]!;
      rgba[d + 1] = raw[p * 3 + 1]!;
      rgba[d + 2] = raw[p * 3 + 2]!;
      rgba[d + 3] = 255;
    } else {
      rgba[d] = raw[p * 2]!;
      rgba[d + 1] = raw[p * 2]!;
      rgba[d + 2] = raw[p * 2]!;
      rgba[d + 3] = raw[p * 2 + 1]!;
    }
  }
  return { width, height, rgba };
}
