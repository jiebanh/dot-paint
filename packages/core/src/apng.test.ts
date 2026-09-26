import { describe, expect, it } from "vitest";
import { buildApngBytes, crc32, filterScanlines } from "./apng";

interface ParsedChunk {
  type: string;
  data: Uint8Array;
}

/** Minimal PNG chunk walker for asserting structure - not a full decoder (no zlib inflate). */
function parseChunks(bytes: Uint8Array): ParsedChunk[] {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  expect([...bytes.slice(0, 8)]).toEqual(signature);

  const chunks: ParsedChunk[] = [];
  let offset = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const data = bytes.slice(offset + 8, offset + 8 + length);
    const storedCrc = view.getUint32(offset + 8 + length);
    const expectedCrc = crc32(bytes.slice(offset + 4, offset + 8 + length));
    expect(storedCrc, `CRC of chunk ${type}`).toBe(expectedCrc);
    chunks.push({ type, data });
    offset += 8 + length + 4;
  }
  return chunks;
}

function u32(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset);
}

describe("filterScanlines", () => {
  it("prepends a filter-type-0 byte to each scanline and copies pixel data through unchanged", () => {
    const rgba = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]); // 2x1 RGBA
    const filtered = filterScanlines(rgba, 2, 1);
    expect([...filtered]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("sizes output as (width*4 + 1) * height", () => {
    const rgba = new Uint8ClampedArray(2 * 3 * 4);
    expect(filterScanlines(rgba, 2, 3)).toHaveLength((2 * 4 + 1) * 3);
  });
});

describe("buildApngBytes", () => {
  it("rejects an empty frame list", () => {
    expect(() => buildApngBytes(1, 1, [])).toThrow(RangeError);
  });

  it("produces a plain PNG (no acTL/fcTL) for a single frame", () => {
    const bytes = buildApngBytes(4, 3, [{ idat: new Uint8Array([1, 2, 3]), delayMs: 100 }]);
    const chunks = parseChunks(bytes);
    const types = chunks.map((c) => c.type);

    expect(types).toEqual(["IHDR", "IDAT", "IEND"]);

    const ihdr = chunks[0].data;
    expect(u32(ihdr, 0)).toBe(4); // width
    expect(u32(ihdr, 4)).toBe(3); // height
  });

  it("adds acTL/fcTL/fdAT chunks for multiple frames, with the right frame count", () => {
    const bytes = buildApngBytes(2, 2, [
      { idat: new Uint8Array([9]), delayMs: 100 },
      { idat: new Uint8Array([8]), delayMs: 250 },
      { idat: new Uint8Array([7]), delayMs: 250 },
    ]);
    const chunks = parseChunks(bytes);
    const types = chunks.map((c) => c.type);

    expect(types).toEqual(["IHDR", "acTL", "fcTL", "IDAT", "fcTL", "fdAT", "fcTL", "fdAT", "IEND"]);

    const actl = chunks[1].data;
    expect(u32(actl, 0)).toBe(3); // num_frames
    expect(u32(actl, 4)).toBe(0); // num_plays (0 = loop forever)

    // Sequence numbers are shared across fcTL and fdAT chunks and increment in emission order:
    // frame 0 is fcTL(0) + IDAT (IDAT carries no sequence number); frames 1/2 are fcTL+fdAT pairs.
    const fctlSequenceNumbers = chunks.filter((c) => c.type === "fcTL").map((c) => u32(c.data, 0));
    expect(fctlSequenceNumbers).toEqual([0, 1, 3]);
    const fdatSequenceNumbers = chunks.filter((c) => c.type === "fdAT").map((c) => u32(c.data, 0));
    expect(fdatSequenceNumbers).toEqual([2, 4]);

    // fdAT payload is the 4-byte sequence number followed by the original idat bytes.
    expect([...chunks.filter((c) => c.type === "fdAT")[0].data.slice(4)]).toEqual([8]);
  });

  it("encodes a frame's delay as delayMs/1000 seconds, capped to a u16 numerator", () => {
    const bytes = buildApngBytes(1, 1, [
      { idat: new Uint8Array([0]), delayMs: 250 },
      { idat: new Uint8Array([0]), delayMs: 99999 },
    ]);
    const fctlChunks = parseChunks(bytes).filter((c) => c.type === "fcTL");
    const delayNum = (data: Uint8Array) => (data[20] << 8) | data[21];
    const delayDen = (data: Uint8Array) => (data[22] << 8) | data[23];

    expect(delayNum(fctlChunks[0].data)).toBe(250);
    expect(delayDen(fctlChunks[0].data)).toBe(1000);
    expect(delayNum(fctlChunks[1].data)).toBe(65535); // capped, since 99999 overflows a u16
  });
});
