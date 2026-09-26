/**
 * Pure APNG byte assembly - no zlib/DOM/Node dependency, so it runs
 * identically in the browser (which deflates via CompressionStream) and the
 * VSCode extension host (which deflates via node:zlib). Callers are
 * responsible for turning each frame into RGBA (core.render + upscaleRgba),
 * filtering it (filterScanlines below), and deflating that into a zlib
 * stream (RFC 1950) - buildApngBytes only wraps already-deflated frame data
 * into the PNG/APNG chunk structure.
 *
 * With a single frame this degrades to a perfectly ordinary PNG (no acTL/
 * fcTL chunks), so it doubles as this project's single-frame PNG encoder too
 * if ever wanted - though packages/web and the VSCode extension currently
 * keep using canvas/pngjs for that path.
 */

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

/** Standard PNG CRC-32 (used to checksum every chunk's type+data). */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function u16be(n: number): [number, number] {
  return [(n >>> 8) & 0xff, n & 0xff];
}

function concatBytes(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array([...type].map((c) => c.charCodeAt(0)));
  const crc = u32be(crc32(concatBytes([typeBytes, data])));
  return concatBytes([u32be(data.length), typeBytes, data, crc]);
}

/**
 * Prepends PNG's per-scanline filter-type byte (always 0/"None" here - pixel
 * art's flat color runs still deflate well without Sub/Paeth filtering, and
 * None keeps this function simple and easy to verify byte-for-byte).
 */
export function filterScanlines(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array<ArrayBuffer> {
  const stride = width * 4;
  const out = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    out[rowStart] = 0; // filter type: None
    out.set(rgba.subarray(y * stride, y * stride + stride), rowStart + 1);
  }
  return out;
}

function buildIhdr(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13);
  data.set(u32be(width), 0);
  data.set(u32be(height), 4);
  data[8] = 8; // bit depth
  data[9] = 6; // color type: truecolor + alpha
  data[10] = 0; // compression method
  data[11] = 0; // filter method
  data[12] = 0; // interlace method
  return data;
}

function buildActl(numFrames: number, numPlays: number): Uint8Array {
  return concatBytes([u32be(numFrames), u32be(numPlays)]);
}

/** APNG's delay is num/den seconds; ms/1000 with a u16-safe numerator covers MAX_FRAME_INTERVAL_MS (10000) comfortably. */
function buildFctl(sequenceNumber: number, width: number, height: number, delayMs: number): Uint8Array {
  const data = new Uint8Array(26);
  data.set(u32be(sequenceNumber), 0);
  data.set(u32be(width), 4);
  data.set(u32be(height), 8);
  data.set(u32be(0), 12); // x_offset
  data.set(u32be(0), 16); // y_offset
  const [numHi, numLo] = u16be(Math.min(65535, Math.round(delayMs)));
  const [denHi, denLo] = u16be(1000);
  data[20] = numHi;
  data[21] = numLo;
  data[22] = denHi;
  data[23] = denLo;
  data[24] = 0; // dispose_op: APNG_DISPOSE_OP_NONE
  data[25] = 0; // blend_op: APNG_BLEND_OP_SOURCE
  return data;
}

export interface ApngFrameInput {
  /** Filtered scanline data (see filterScanlines), deflated as a zlib stream (RFC 1950) - the same payload IDAT expects. */
  idat: Uint8Array;
  delayMs: number;
}

/** Assembles a full PNG byte stream; with more than one frame it's an APNG (acTL/fcTL/fdAT chunks added). */
export function buildApngBytes(
  width: number,
  height: number,
  frames: ApngFrameInput[],
  numPlays = 0,
): Uint8Array<ArrayBuffer> {
  if (frames.length === 0) {
    throw new RangeError("buildApngBytes needs at least one frame");
  }

  const isAnimated = frames.length > 1;
  const parts: Uint8Array[] = [PNG_SIGNATURE, chunk("IHDR", buildIhdr(width, height))];
  if (isAnimated) parts.push(chunk("acTL", buildActl(frames.length, numPlays)));

  let sequenceNumber = 0;
  frames.forEach((frame, i) => {
    if (isAnimated) parts.push(chunk("fcTL", buildFctl(sequenceNumber++, width, height, frame.delayMs)));
    if (i === 0) {
      parts.push(chunk("IDAT", frame.idat));
    } else {
      parts.push(chunk("fdAT", concatBytes([u32be(sequenceNumber++), frame.idat])));
    }
  });

  parts.push(chunk("IEND", new Uint8Array(0)));
  return concatBytes(parts);
}
