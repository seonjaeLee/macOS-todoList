#!/usr/bin/env node
/**
 * npm start — dist 앱 바이너리 실행 (Electron 호스트 미사용)
 * mac: `electron .`는 Electron.app이 Dock에 남아 아이콘이 깨지므로 사용하지 않음.
 * win: 동일하게 electron-builder dir 빌드(dist/win-unpacked)를 실행해 실제 배포본과
 *      가까운 상태로 개발 확인한다.
 */
const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const IS_MAC = process.platform === 'darwin'
const IS_WIN = process.platform === 'win32'

const root = path.resolve(__dirname, '..')

const appBin = IS_MAC
  ? path.join(root, 'dist/mac-arm64/todoList-myfunfun.app/Contents/MacOS/todoList-myfunfun')
  : path.join(root, 'dist/win-unpacked/todoList-myfunfun.exe')

const asarPath = IS_MAC
  ? path.join(root, 'dist/mac-arm64/todoList-myfunfun.app/Contents/Resources/app.asar')
  : path.join(root, 'dist/win-unpacked/resources/app.asar')

const BUILD_SCRIPT = IS_MAC ? 'build:dir' : 'build:win:dir'

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
  'tray-menu.html',
  'tray-menu.css',
  'tray-menu.js',
  'tray-menu-preload.js',
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

if (!IS_MAC && !IS_WIN) {
  console.error('[start] macOS·Windows 전용입니다.')
  process.exit(1)
}

if (needsRebuild()) {
  console.log(`[start] 소스 변경 감지 → dist 앱 빌드 중… (npm run ${BUILD_SCRIPT})`)
  execSync(`npm run ${BUILD_SCRIPT}`, { cwd: root, stdio: 'inherit' })
}

console.log(IS_MAC ? '[start] dist/todoList-myfunfun.app 실행 (체크 Dock 아이콘)' : '[start] dist/win-unpacked/todoList-myfunfun.exe 실행')
const child = spawn(appBin, [], { stdio: 'inherit', env: { ...process.env } })
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
