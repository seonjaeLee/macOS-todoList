#!/usr/bin/env node
/**
 * build/icon.png → build/icon.ico (Windows 빌드용, 디자인 변경 없음)
 * 최초 1회 또는 icon.png 교체 후: node scripts/generate-win-icon.js
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const pngPath = path.join(root, 'build/icon.png')
const icoPath = path.join(root, 'build/icon.ico')

async function main() {
  if (!fs.existsSync(pngPath)) {
    console.error('build/icon.png 가 없습니다.')
    process.exit(1)
  }
  let pngToIco
  try {
    pngToIco = require('png-to-ico')
  } catch {
    console.error('png-to-ico 가 없습니다. npm install 실행 후 다시 시도하세요.')
    process.exit(1)
  }
  const buf = await pngToIco(pngPath)
  fs.writeFileSync(icoPath, buf)
  console.log('Wrote', icoPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
