/**
 * generate-icon.js
 * 빌드 전 실행 → build/icon.png (512×512) 생성
 * electron-builder가 이 PNG를 .icns로 변환해 앱 번들에 삽입
 */
const fs   = require('fs')
const path = require('path')
const zlib = require('zlib')

const W = 512, H = 512
const px = Buffer.alloc(W * H * 4, 0)

function set(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const i = (y * W + x) * 4
  px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a
}

function drawLine(x0, y0, x1, y1, r, g, b, t = 20) {
  const dx = Math.abs(x1-x0), dy = Math.abs(y1-y0)
  const sx = x0<x1?1:-1, sy = y0<y1?1:-1
  let err = dx-dy, cx = x0, cy = y0
  while (true) {
    for (let ty = -t; ty <= t; ty++) for (let tx = -t; tx <= t; tx++)
      if (tx*tx+ty*ty <= t*t) set(cx+tx, cy+ty, r, g, b)
    if (cx===x1 && cy===y1) break
    const e2 = 2*err
    if (e2 > -dy) { err -= dy; cx += sx }
    if (e2 < dx)  { err += dx; cy += sy }
  }
}

// ① 라운드 사각형 배경 (연한 회색)
const R = 108
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const ax = Math.max(R - x, 0, x - (W - 1 - R))
    const ay = Math.max(R - y, 0, y - (H - 1 - R))
    const dist = Math.sqrt(ax*ax + ay*ay)
    if (dist <= R - 1) {
      set(x, y, 220, 222, 228, 255)
    } else if (dist <= R + 1) {
      const a = Math.round((1 - (dist - (R-1)) / 2) * 255)
      set(x, y, 220, 222, 228, Math.max(0, a))
    }
  }
}

// ② 중앙 다크 원
const cx = 256, cy = 256, cr = 176
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dist = Math.sqrt((x-cx)**2 + (y-cy)**2)
    if (dist <= cr - 1) {
      set(x, y, 45, 47, 55, 255)
    } else if (dist <= cr + 1) {
      const a = Math.round((1 - (dist - (cr-1)) / 2) * 255)
      set(x, y, 45, 47, 55, Math.max(0, a))
    }
  }
}

// ③ 흰색 체크마크
drawLine(176, 256, 236, 320, 255, 255, 255, 20)  // 짧은 팔 ↘
drawLine(236, 320, 356, 188, 255, 255, 255, 20)  // 긴 팔 ↗

// PNG 인코딩
const BPP = 4
const raw = Buffer.alloc(H * (1 + W * BPP))
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * BPP)] = 0
  px.copy(raw, y*(1+W*BPP)+1, y*W*BPP, (y+1)*W*BPP)
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c&1) ? 0xEDB88320^(c>>>1) : (c>>>1)
  crcTable[n] = c>>>0
}
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = crcTable[(c^b)&0xFF]^(c>>>8)
  return (c^0xFFFFFFFF)>>>0
}
function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0)
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t,data])), 0)
  return Buffer.concat([len, t, data, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8]=8; ihdr[9]=6

const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  makeChunk('IHDR', ihdr),
  makeChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  makeChunk('IEND', Buffer.alloc(0)),
])

const { execSync } = require('child_process')

const buildDir   = path.join(__dirname, 'build')
const tmpPng     = path.join(buildDir, 'icon_tmp.png')
const iconsetDir = path.join(buildDir, 'icon.iconset')
const icnsPath   = path.join(buildDir, 'icon.icns')

fs.mkdirSync(iconsetDir, { recursive: true })
fs.writeFileSync(tmpPng, png)

// macOS iconset에 필요한 크기 목록
const sizes = [
  { size: 16,   name: 'icon_16x16.png' },
  { size: 32,   name: 'icon_16x16@2x.png' },
  { size: 32,   name: 'icon_32x32.png' },
  { size: 64,   name: 'icon_32x32@2x.png' },
  { size: 128,  name: 'icon_128x128.png' },
  { size: 256,  name: 'icon_128x128@2x.png' },
  { size: 256,  name: 'icon_256x256.png' },
  { size: 512,  name: 'icon_256x256@2x.png' },
  { size: 512,  name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
]

// sips로 각 크기 생성 (macOS 빌트인)
for (const { size, name } of sizes) {
  execSync(`sips -z ${size} ${size} "${tmpPng}" --out "${path.join(iconsetDir, name)}" > /dev/null 2>&1`)
}

// iconutil로 .icns 생성 (macOS 빌트인)
execSync(`iconutil -c icns "${iconsetDir}" --out "${icnsPath}"`)

// 임시 파일 정리
fs.rmSync(tmpPng)
fs.rmSync(iconsetDir, { recursive: true })

console.log('✓ build/icon.icns 생성 완료')
