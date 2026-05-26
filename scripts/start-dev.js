#!/usr/bin/env node
/**
 * npm start — dist 앱 바이너리 실행 (Electron 호스트 미사용)
 * `electron .`는 Electron.app이 Dock에 남아 아이콘이 깨지므로 사용하지 않음.
 */
const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.resolve(__dirname, '..')
const appBin = path.join(
  root,
  'dist/mac-arm64/todoList-myfunfun.app/Contents/MacOS/todoList-myfunfun'
)
const asarPath = path.join(
  root,
  'dist/mac-arm64/todoList-myfunfun.app/Contents/Resources/app.asar'
)

const SOURCE_FILES = [
  'main.js',
  'preload.js',
  'widget.html',
  'widget.css',
  'widget.js',
  'memo-list.html',
  'memo-list.css',
  'memo-list.js',
  'guide.html',
  'tooltip.html',
  'Delete_icon.png',
  'status_icon.png',
]

function newestSourceMtime() {
  let max = 0
  for (const f of SOURCE_FILES) {
    const p = path.join(root, f)
    if (!fs.existsSync(p)) continue
    max = Math.max(max, fs.statSync(p).mtimeMs)
  }
  return max
}

function needsRebuild() {
  if (!fs.existsSync(appBin) || !fs.existsSync(asarPath)) return true
  return newestSourceMtime() > fs.statSync(asarPath).mtimeMs
}

if (process.platform !== 'darwin') {
  console.error('[start] macOS 전용입니다.')
  process.exit(1)
}

if (needsRebuild()) {
  console.log('[start] 소스 변경 감지 → dist 앱 빌드 중…')
  execSync('npm run build:dir', { cwd: root, stdio: 'inherit' })
}

console.log('[start] dist/todoList-myfunfun.app 실행 (체크 Dock 아이콘)')
const child = spawn(appBin, [], { stdio: 'inherit', env: { ...process.env } })
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
