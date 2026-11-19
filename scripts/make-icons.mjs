// Draws the app icons as PNG files using only Node built-in modules.
// Run with: node scripts/make-icons.mjs
// The artwork matches public/icons/icon.svg: a plum tile, a paper patch with a
// dashed stitch line, and a stitched letter R.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const PLUM = [0x5a, 0x3d, 0x6b];
const PAPER = [0xfb, 0xf8, 0xf1];
const STITCH = [0x6b, 0x5b, 0x7b];

// Distance helpers in a 512 unit design space.
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Letter R as stroked segments: stem, bowl (polyline), leg.
function letterR(left, top, size) {
  const s = size / 100;
  const p = (u, v) => [left + u * s, top + v * s];
  const pts = [p(0, 100), p(0, 0), p(45, 0), p(68, 8), p(76, 25), p(68, 42), p(45, 50), p(0, 50)];
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([...pts[i], ...pts[i + 1]]);
  segs.push([...p(45, 50), ...p(80, 100)]);
  return { segs, width: 11 * s };
}

function colourAt(x, y, maskable) {
  // x and y are in 0..512 design units.
  let patch;
  let dashBox;
  let letter;
  if (maskable) {
    patch = [96, 96, 416, 416, 48];
    dashBox = [116, 116, 396, 396];
    letter = letterR(190, 160, 190);
  } else {
    if (!inRoundRect(x, y, 0, 0, 512, 512, 96)) return null;
    patch = [64, 64, 448, 448, 56];
    dashBox = [88, 88, 424, 424];
    letter = letterR(182, 136, 240);
  }
  let colour = PLUM;
  if (inRoundRect(x, y, ...patch)) {
    colour = PAPER;
    // Dashed stitch line along the inside of the patch.
    const [bx0, by0, bx1, by1] = dashBox;
    const onH = (y >= by0 - 4 && y <= by0 + 4) || (y >= by1 - 4 && y <= by1 + 4);
    const onV = (x >= bx0 - 4 && x <= bx0 + 4) || (x >= bx1 - 4 && x <= bx1 + 4);
    const inX = x >= bx0 + 24 && x <= bx1 - 24;
    const inY = y >= by0 + 24 && y <= by1 - 24;
    if (((onH && inX && Math.floor(x / 24) % 2 === 0) || (onV && inY && Math.floor(y / 24) % 2 === 0))) {
      colour = STITCH;
    }
    for (const [ax, ay, cx, cy] of letter.segs) {
      if (distToSegment(x, y, ax, ay, cx, cy) <= letter.width / 2) {
        colour = PLUM;
        break;
      }
    }
  }
  return colour;
}

// CRC32 for PNG chunks.
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function renderPng(size, maskable) {
  const SS = 3; // supersampling for smooth edges
  const rowLen = size * 4 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let py = 0; py < size; py++) {
    raw[py * rowLen] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * 512;
          const y = ((py + (sy + 0.5) / SS) / size) * 512;
          const c = colourAt(x, y, maskable);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 1;
          }
        }
      }
      const n = SS * SS;
      const o = py * rowLen + 1 + px * 4;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / n) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];
for (const [name, size, maskable] of targets) {
  writeFileSync(join(OUT, name), renderPng(size, maskable));
  console.log(`wrote public/icons/${name}`);
}
