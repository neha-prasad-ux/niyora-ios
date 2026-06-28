// One-off: generates a transparent starfield PNG (white stars on transparent)
// laid over the PMS card's cosmic gradient. Pure Node, no deps. Grayscale+alpha
// (PNG colour type 4) so the field is transparent except the stars.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 300;
const H = 300;
const STAR_COUNT = 170;

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
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// raw scanlines: filter byte (0) + W * [gray, alpha]
const raw = Buffer.alloc(H * (1 + W * 2));
// initialise: white, fully transparent
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0;
  for (let x = 0; x < W; x++) {
    raw[p++] = 255; // gray
    raw[p++] = 0; // alpha
  }
}
function rowStart(y) {
  return y * (1 + W * 2) + 1;
}
function setAlpha(x, y, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = rowStart(y) + x * 2 + 1;
  if (a > raw[idx]) raw[idx] = a;
}

for (let i = 0; i < STAR_COUNT; i++) {
  const x = Math.floor(Math.random() * W);
  const y = Math.floor(Math.random() * H);
  const a = 70 + Math.floor(Math.random() * 185); // 70..255
  setAlpha(x, y, a);
  // a portion are slightly bigger with a soft halo
  if (Math.random() < 0.28) {
    const halo = Math.floor(a * 0.4);
    setAlpha(x + 1, y, halo);
    setAlpha(x - 1, y, halo);
    setAlpha(x, y + 1, halo);
    setAlpha(x, y - 1, halo);
  }
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 4; // colour type: grayscale + alpha
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);

const out = path.join(__dirname, '..', 'assets', 'images', 'starfield.png');
fs.writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
