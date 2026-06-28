// One-off: generates a soft grayscale value-noise PNG used as the shared
// "moon surface" card texture (tinted per card at runtime). Run once with
// node; the output asset is committed. Pure Node, no deps.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 256;
const H = 256;

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function grid(cells) {
  const g = [];
  for (let i = 0; i <= cells; i++) {
    g[i] = [];
    for (let j = 0; j <= cells; j++) g[i][j] = Math.random();
  }
  return g;
}
function sample(g, cells, x, y) {
  const gx = x * cells;
  const gy = y * cells;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const tx = gx - x0;
  const ty = gy - y0;
  const a = g[x0][y0];
  const b = g[x0 + 1][y0];
  const c = g[x0][y0 + 1];
  const d = g[x0 + 1][y0 + 1];
  const top = a + (b - a) * tx;
  const bot = c + (d - c) * tx;
  return top + (bot - top) * ty;
}

const octaves = [
  { cells: 4, w: 0.5 },
  { cells: 8, w: 0.25 },
  { cells: 16, w: 0.16 },
  { cells: 40, w: 0.09 },
];
const grids = octaves.map((o) => grid(o.cells));

const raw = Buffer.alloc(H * (1 + W));
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0; // no filter on this scanline
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const v = y / H;
    let val = 0;
    for (let i = 0; i < octaves.length; i++) val += sample(grids[i], octaves[i].cells, u, v) * octaves[i].w;
    // Center around mid-gray with gentle range, so an overlay adds soft
    // light/dark mottling rather than harsh grain.
    const gray = Math.max(0, Math.min(255, Math.round(95 + val * 120)));
    raw[p++] = gray;
  }
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 0; // colour type: grayscale
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'assets', 'images', 'moon-texture.png');
fs.writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
