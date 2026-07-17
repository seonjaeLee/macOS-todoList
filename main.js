const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const zlib = require('zlib')

const IS_MAC = process.platform === 'darwin'
const IS_WIN = process.platform === 'win32'
// mac: 메뉴바 트레이만. win: 작업 표시줄에도 표시(트레이·Alt+Tab·종료 경로)
const SKIP_WIDGET_TASKBAR = IS_MAC

if (IS_WIN) {
  app.setAppUserModelId('com.desktop-todo')
}

// ───────────────────────────── 싱글 인스턴스 보장 ─────────────────────────────
// 이미 실행 중인 인스턴스가 있으면 즉시 종료
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

// 두 번째 실행 시도가 들어오면 기존 위젯을 모두 앞으로 꺼냄
app.on('second-instance', () => {
  widgetStates.forEach(({ win }) => {
    if (!win.isDestroyed()) { win.show(); win.focus() }
  })
})

// ───────────────────────────── Dock (설치·dist 앱) ─────────────────────────────
// npm start = dist 바이너리(isPackaged). start:electron = Electron 호스트( Dock 이상 가능).
// 정책: docs/icon-policy.md

if (process.platform === 'darwin' && !app.isPackaged) {
  app.setActivationPolicy('accessory')
}

function configureAppPresentation() {
  if (process.platform !== 'darwin' || !app.dock) return
  if (app.isPackaged) {
    app.setActivationPolicy('regular')
    app.dock.show()
  } else if (app.dock) {
    app.dock.hide()
  }
}

// ───────────────────────────── 데이터 저장 경로 ─────────────────────────────
const DATA_FILE = path.join(app.getPath('userData'), 'widgets.json')
const BACKUP_FILE = `${DATA_FILE}.bak`
const INIT_FLAG  = path.join(app.getPath('userData'), '.initialized')

// 비정상 종료(강제 종료·정전·업데이트 재시작 등) 도중 쓰기가 끊기면 JSON이
// 깨질 수 있다. 이 경우 조용히 빈 배열을 반환하던 이전 로직이 시작 시
// "기존 자료 없음"으로 오인되어 기본 위젯으로 즉시 덮어써지는 데이터 유실을
// 유발했다(#가끔 메모가 전부 사라짐). 백업 파일로 폴백하고, 그마저 실패하면
// 손상 파일을 지우지 않고 보존해 복구 여지를 남긴다.
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch (e) {
    console.error('데이터 로드 실패, 백업에서 복구 시도:', e)
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const recovered = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'))
        console.error('백업에서 복구 성공')
        return recovered
      }
    } catch (e2) {
      console.error('백업 복구도 실패:', e2)
    }
    try {
      fs.renameSync(DATA_FILE, `${DATA_FILE}.corrupted-${Date.now()}`)
    } catch (e3) {}
  }
  return []
}

// 임시 파일에 쓴 뒤 rename으로 교체(원자적 치환) — 도중에 프로세스가 죽어도
// 기존 widgets.json은 그대로 남아 손상되지 않는다. 매 저장 전 직전 상태를
// .bak으로 남겨 메인 파일이 깨졌을 때도 최근 데이터를 복구할 수 있게 한다.
function saveData(widgets) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
    if (fs.existsSync(DATA_FILE)) {
      try { fs.copyFileSync(DATA_FILE, BACKUP_FILE) } catch (e) {}
    }
    const tmpFile = `${DATA_FILE}.tmp`
    fs.writeFileSync(tmpFile, JSON.stringify(widgets, null, 2), 'utf-8')
    fs.renameSync(tmpFile, DATA_FILE)
  } catch (e) { console.error('데이터 저장 실패:', e) }
}

// ───────────────────────────── 메뉴바 아이콘 PNG 생성 ─────────────────────────────
// 순수 Node.js(zlib)로 18×18 체크리스트 아이콘을 36×36 @2x PNG로 생성.
// 검정 픽셀 + 투명 배경 → setTemplateImage(true) → 라이트/다크 모드 자동 대응.
function createTrayIconPNG() {
  // 18×18 논리 픽셀 (0=투명, 1=검정) — macOS 템플릿 이미지
  //
  // 디자인:  위) ✓ + 선   아래) □ + 선
  //
  //  col: 0 1 2 3 4 5 6 7 8 … 15
  //  r3:  . . . . ✓ . . . . .        ← ✓ tip
  //  r4:  . . . ✓ . . ━ ━ ━ ━ …    ← ✓ arm + line
  //  r5:  . . ✓ . . . ━ ━ ━ ━ …    ← ✓ foot + line (2px)
  //  r6:  . ✓ . . . . . . . .
  //  r10: . □ □ □ □ . . . . .        ← □ top
  //  r11: . □ . . □ . ━ ━ ━ ━ …    ← □ sides + line
  //  r12: . □ . . □ . ━ ━ ━ ━ …    ← □ sides + line (2px)
  //  r13: . □ □ □ □ . . . . .        ← □ bottom
  const grid = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 0
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 1
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 2
    [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 3  ✓ tip
    [0,0,0,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0], // row 4  ✓ arm + line
    [0,0,1,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0], // row 5  ✓ foot + line
    [0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 6  ✓ end
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 7
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 8
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row 9
    [0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0], // row10  □ top
    [0,1,0,0,1,0,1,1,1,1,1,1,1,1,1,1,0,0], // row11  □ sides + line
    [0,1,0,0,1,0,1,1,1,1,1,1,1,1,1,1,0,0], // row12  □ sides + line
    [0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0], // row13  □ bottom
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row14
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row15
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row16
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // row17
  ]

  // 2배 스케일 → 36×36 (레티나 @2x)
  const W = 36, H = 36
  const scaled = []
  for (const row of grid) {
    const r = []
    for (const p of row) r.push(p, p)
    scaled.push(r, [...r])
  }

  // PNG 원시 데이터 구성 (그레이스케일 + 알파, color type 4)
  const BPP = 2
  const raw = Buffer.alloc(H * (1 + W * BPP))
  for (let y = 0; y < H; y++) {
    const base = y * (1 + W * BPP)
    raw[base] = 0 // 필터: None
    for (let x = 0; x < W; x++) {
      const off = base + 1 + x * BPP
      raw[off]     = 0                      // gray = 0 (검정)
      raw[off + 1] = scaled[y][x] ? 255 : 0 // alpha
    }
  }

  // CRC32 구현
  const crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : (c >>> 1)
    crcTable[n] = c >>> 0
  }
  function crc32(buf) {
    let c = 0xFFFFFFFF
    for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)
    return (c ^ 0xFFFFFFFF) >>> 0
  }

  function makeChunk(type, data) {
    const t = Buffer.from(type, 'ascii')
    const len = Buffer.allocUnsafe(4)
    len.writeUInt32BE(data.length, 0)
    const crcBuf = Buffer.allocUnsafe(4)
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
    return Buffer.concat([len, t, data, crcBuf])
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 4 // bit depth=8, color type=grayscale+alpha

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG 시그니처
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

// ───────────────────────────── 위젯 상태 ─────────────────────────────
const widgetStates = new Map()
let tray = null
let trayMenuWin = null
let trayMenuPlaceAnchor = null
const TRAY_MENU_W = 168
let listWin = null
let allWidgetsHiddenMode = false

const COLORS = ['#FFF176', '#FFD54F', '#80DEEA', '#EF9A9A', '#CE93D8', '#A5D6A7']
const WIDGET_W = 260
const WIDGET_H_EXPANDED = 340
const WIDGET_H_COLLAPSED = IS_WIN ? 38 : 44
const COLUMN_GAP = 1
// x 구간 겹침이 아니라 중심 X로 열 판정 (두 시각적 열이 한 열로 묶이는 것 방지)
const COLUMN_X_CENTER_THRESHOLD = 80

// ───────────────────────────── macOS 스타일 공유 툴팁 창 (메모 창 밖에 표시) ─────────────────────────────
let tooltipWin = null
let tooltipOwnerWin = null
let tooltipReadyPromise = null

const TOOLTIP_MEASURE_W = 640
const TOOLTIP_MEASURE_H = 120

function ensureTooltipWindow() {
  if (tooltipWin && !tooltipWin.isDestroyed()) return tooltipWin

  tooltipWin = new BrowserWindow({
    width: TOOLTIP_MEASURE_W,
    height: TOOLTIP_MEASURE_H,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    show: false,
    type: process.platform === 'darwin' ? 'panel' : 'tooltip',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  tooltipWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
  tooltipReadyPromise = new Promise((resolve, reject) => {
    tooltipWin.webContents.once('did-finish-load', resolve)
    tooltipWin.webContents.once('did-fail-load', (_e, code, desc) => {
      reject(new Error(`tooltip load failed: ${code} ${desc}`))
    })
  })
  tooltipWin.loadFile(path.join(__dirname, 'tooltip.html'))
  return tooltipWin
}

async function ensureTooltipPageReady() {
  const tip = ensureTooltipWindow()
  if (tooltipReadyPromise) {
    await tooltipReadyPromise
    tooltipReadyPromise = null
  } else if (tip.webContents.isLoading()) {
    await new Promise((resolve) => tip.webContents.once('did-finish-load', resolve))
  }
  const ok = await tip.webContents.executeJavaScript('!!document.getElementById("tip-svg")')
  if (!ok) throw new Error('tooltip page DOM not ready')
  return tip
}

function hideTooltipWindow() {
  if (tooltipWin && !tooltipWin.isDestroyed()) tooltipWin.hide()
  tooltipOwnerWin = null
}

function closeTrayMenuWindow() {
  if (trayMenuWin && !trayMenuWin.isDestroyed()) trayMenuWin.close()
  trayMenuWin = null
  trayMenuPlaceAnchor = null
}

/** Windows: transparent 창은 메모(불투명) 아래로 깔릴 수 있음 → 트레이 메뉴만 최상위 레벨 */
function raiseTrayMenuWindow() {
  if (!trayMenuWin || trayMenuWin.isDestroyed()) return
  applyAlwaysOnTop(trayMenuWin, true)
  if (!trayMenuWin.isVisible()) trayMenuWin.show()
  trayMenuWin.moveTop()
  trayMenuWin.focus()
}

function placeTrayMenuWindow(menuHeight) {
  if (!trayMenuWin || trayMenuWin.isDestroyed() || !trayMenuPlaceAnchor) return
  const { anchor, trayBounds } = trayMenuPlaceAnchor
  const h = Math.max(120, Math.min(320, Math.round(menuHeight)))
  const display = screen.getDisplayNearestPoint(anchor)
  const area = display.workArea
  let x = anchor.x - Math.round(TRAY_MENU_W / 2)
  let y = anchor.y - h - 6
  if (y < area.y + 4) y = anchor.y + (trayBounds.height || 16) + 6
  x = clamp(x, area.x + 4, area.x + area.width - TRAY_MENU_W - 4)
  y = clamp(y, area.y + 4, area.y + area.height - h - 4)
  trayMenuWin.setBounds({ x, y, width: TRAY_MENU_W, height: h })
  raiseTrayMenuWindow()
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max)
}

/** mac: floating. win: screen-saver(다른 창 위 고정에 유리). */
function applyAlwaysOnTop(win, enabled) {
  if (!win || win.isDestroyed()) return
  if (!enabled) {
    win.setAlwaysOnTop(false)
    return
  }
  if (IS_WIN) win.setAlwaysOnTop(true, 'screen-saver')
  else if (IS_MAC) win.setAlwaysOnTop(true, 'floating')
  else win.setAlwaysOnTop(true)
}

async function layoutTooltipContent(text, preferBelow) {
  const tip = await ensureTooltipPageReady()
  const pointUp = !!preferBelow

  tip.setBounds({
    x: -32000,
    y: -32000,
    width: TOOLTIP_MEASURE_W,
    height: TOOLTIP_MEASURE_H,
  })

  return tip.webContents.executeJavaScript(`
    (() => {
      const svg = document.getElementById('tip-svg');
      const shape = document.getElementById('tip-shape');
      const label = document.getElementById('tip-text');
      if (!svg || !shape || !label) return { width: 0, height: 0 };

      const PAD_X = 8;
      const PAD_Y = 4;
      const R = 5;
      const ARROW_W = 10;
      const ARROW_H = 5;
      const MARGIN = 10;
      const arrowAtTop = ${pointUp};

      label.textContent = ${JSON.stringify(text)};
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');

      const bbox = label.getBBox();
      const bodyW = Math.max(28, Math.ceil(bbox.width) + PAD_X * 2);
      const bodyH = Math.max(18, Math.ceil(bbox.height) + PAD_Y * 2);
      const tipW = bodyW;
      const tipH = bodyH + ARROW_H;
      const svgW = tipW + MARGIN * 2;
      const svgH = tipH + MARGIN * 2;
      const x0 = MARGIN;
      const y0 = MARGIN;
      const cx = x0 + tipW / 2;

      let d;
      if (arrowAtTop) {
        const top = y0 + ARROW_H;
        const bottom = top + bodyH;
        d = [
          'M', cx, y0,
          'L', cx + ARROW_W / 2, top,
          'H', x0 + tipW - R,
          'Q', x0 + tipW, top, x0 + tipW, top + R,
          'V', bottom - R,
          'Q', x0 + tipW, bottom, x0 + tipW - R, bottom,
          'H', x0 + R,
          'Q', x0, bottom, x0, bottom - R,
          'V', top + R,
          'Q', x0, top, x0 + R, top,
          'H', cx - ARROW_W / 2,
          'Z',
        ].join(' ');
        label.setAttribute('x', String(cx));
        label.setAttribute('y', String(top + bodyH / 2));
      } else {
        const bottom = y0 + bodyH;
        d = [
          'M', x0 + R, y0,
          'H', x0 + tipW - R,
          'Q', x0 + tipW, y0, x0 + tipW, y0 + R,
          'V', bottom - R,
          'Q', x0 + tipW, bottom, x0 + tipW - R, bottom,
          'H', cx + ARROW_W / 2,
          'L', cx, bottom + ARROW_H,
          'L', cx - ARROW_W / 2, bottom,
          'H', x0 + R,
          'Q', x0, bottom, x0, bottom - R,
          'V', y0 + R,
          'Q', x0, y0, x0 + R, y0,
          'Z',
        ].join(' ');
        label.setAttribute('x', String(cx));
        label.setAttribute('y', String(y0 + bodyH / 2));
      }

      shape.setAttribute('d', d);
      svg.setAttribute('width', String(svgW));
      svg.setAttribute('height', String(svgH));
      svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);

      return { width: svgW, height: svgH };
    })()
  `)
}

async function showTooltipWindow(ownerWin, payload) {
  const { anchorLeft, anchorTop, anchorWidth, anchorHeight, text, preferBelow } = payload
  if (!ownerWin || ownerWin.isDestroyed() || !text) return
  if (typeof anchorLeft !== 'number' || typeof anchorTop !== 'number') return

  const tip = await ensureTooltipPageReady()
  if (!tip.isDestroyed()) tip.hide()
  tooltipOwnerWin = ownerWin

  const ownerBounds = ownerWin.getBounds()
  const anchorScreenX = ownerBounds.x + anchorLeft
  const anchorScreenY = ownerBounds.y + anchorTop

  let placeBelow = !!preferBelow
  let size = await layoutTooltipContent(text, placeBelow)
  if (!size.width || !size.height) {
    console.error('tooltip layout size invalid', { size, text })
    return
  }

  const anchorCenterX = anchorScreenX + anchorWidth / 2
  const anchorBottom = anchorScreenY + anchorHeight
  const gap = 6

  const display = screen.getDisplayNearestPoint({ x: anchorCenterX, y: anchorScreenY })
  const area = display.workArea

  let x = anchorCenterX - size.width / 2
  let y = placeBelow ? anchorBottom + gap : anchorScreenY - size.height - gap

  if (placeBelow && y + size.height > area.y + area.height - 4) {
    placeBelow = false
    size = await layoutTooltipContent(text, placeBelow)
    y = anchorScreenY - size.height - gap
  } else if (!placeBelow && y < area.y + 4) {
    placeBelow = true
    size = await layoutTooltipContent(text, placeBelow)
    y = anchorBottom + gap
  }

  x = clamp(x, area.x + 4, area.x + area.width - size.width - 4)
  y = clamp(y, area.y + 4, area.y + area.height - size.height - 4)

  tip.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: size.width,
    height: size.height,
  })
  applyAlwaysOnTop(tip, true)
  tip.showInactive()
}

function bindTooltipOwnerCleanup(win) {
  const clearIfOwner = () => {
    if (tooltipOwnerWin === win) hideTooltipWindow()
  }
  win.on('hide', clearIfOwner)
  win.on('closed', clearIfOwner)
}

function hslToHex(h, s, l) {
  const saturation = s / 100
  const lightness = l / 100
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lightness - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (value) => Math.round((value + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function getRandomBrightColor() {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 45 + Math.floor(Math.random() * 36) // 45~80%
  const lightness = 90 + Math.floor(Math.random() * 7)   // 90~96%
  return hslToHex(hue, saturation, lightness)
}

function createWidget(data) {
  const { workArea } = screen.getPrimaryDisplay()
  const win = new BrowserWindow({
    x: data.x ?? workArea.x + 40 + widgetStates.size * 30,
    y: data.y ?? workArea.y + 40 + widgetStates.size * 30,
    width: data.width ?? WIDGET_W,
    height: data.collapsed ? WIDGET_H_COLLAPSED : (data.expandedHeight ?? WIDGET_H_EXPANDED),
    minWidth: WIDGET_W,
    minHeight: WIDGET_H_COLLAPSED,
    frame: false,
    transparent: false,
    backgroundColor: data.color,
    roundedCorners: false,
    // 리사이즈는 자체 JS 핸들(.resize-handle)+IPC로 전부 직접 구현하므로
    // OS 네이티브 리사이즈는 꺼둔다. 켜져 있으면 macOS가 창 가장자리에
    // 보이지 않는 자체 리사이즈 감지 영역을 예약해 우리 핸들과 경쟁하고,
    // 다른 앱 창이 인접해 있을 때 클릭이 그쪽으로 새는 원인이 됐다.
    resizable: false,
    skipTaskbar: SKIP_WIDGET_TASKBAR,
    hasShadow: false,
    maximizable: false,   // macOS "타이틀바 더블클릭→줌" OS 동작 방지
    minimizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (IS_MAC) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
  if (data.alwaysOnTop) applyAlwaysOnTop(win, true)
  win.loadFile('widget.html')

  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.meta && input.key?.toLowerCase() === 'r') {
        event.preventDefault()
        win.reload()
      }
    })
  }

  win.webContents.once('did-finish-load', () => {
    win.webContents.send('init-widget', data)
    // 로딩 타이밍과 무관하게 "모두 숨기기" 상태를 우선 적용한다.
    if (!data.hidden && !allWidgetsHiddenMode) {
      win.show()
      updateTrayMenu()
      return
    }
    data.hidden = true
    win.hide()
    updateTrayMenu()
  })

  win.on('moved',   () => saveWindowBounds(data.id, win))
  win.on('resized', () => saveWindowBounds(data.id, win))
  win.on('closed',  () => {
    widgetStates.delete(data.id)
    updateTrayMenu()
    notifyWidgetListUpdated()
  })
  win.on('focus',   () => win.moveTop())

  widgetStates.set(data.id, { win, data })
  bindTooltipOwnerCleanup(win)
  updateTrayMenu()
  notifyWidgetListUpdated()
  return win
}

function saveWindowBounds(widgetId, win) {
  if (win.isDestroyed()) return
  const { x, y, width, height } = win.getBounds()
  const state = widgetStates.get(widgetId)
  if (!state) return
  state.data.x = x
  state.data.y = y
  state.data.width = width
  if (!state.data.collapsed) state.data.expandedHeight = height
  persistAll()
}

function persistAll() {
  saveData([...widgetStates.values()].map((s) => s.data))
}

// ───────────────────────────── 위젯 표시/숨기기 ─────────────────────────────
function areAllVisible() {
  return [...widgetStates.values()].every((s) => !s.win.isDestroyed() && s.win.isVisible())
}

function showAllWidgets() {
  allWidgetsHiddenMode = false
  widgetStates.forEach(({ win, data }) => { if (!win.isDestroyed()) { win.show(); data.hidden = false } })
  persistAll()
  updateTrayMenu()
  notifyWidgetListUpdated()
}

function hideAllWidgets() {
  allWidgetsHiddenMode = true
  widgetStates.forEach(({ win, data }) => { if (!win.isDestroyed()) { win.hide(); data.hidden = true } })
  persistAll()
  updateTrayMenu()
  notifyWidgetListUpdated()
}

// ───────────────────────────── 로그인 시 자동 실행 ─────────────────────────────
// Windows portable 빌드는 실행할 때마다 임시 폴더에 풀려 process.execPath가 매번 바뀜.
// electron-builder portable 런처가 심어주는 PORTABLE_EXECUTABLE_FILE(사용자가 실제로 받은
// 고정 exe 경로)로 등록해야 재부팅 후에도 자동 실행이 유지됨.
function getLoginItemOptions() {
  if (IS_WIN && process.env.PORTABLE_EXECUTABLE_FILE) {
    return { path: process.env.PORTABLE_EXECUTABLE_FILE }
  }
  return {}
}

function getOpenAtLogin() {
  return app.getLoginItemSettings(getLoginItemOptions()).openAtLogin
}

function setOpenAtLogin(enabled) {
  app.setLoginItemSettings({ ...getLoginItemOptions(), openAtLogin: enabled })
}

// ───────────────────────────── 트레이 ─────────────────────────────
function setupTray() {
  const trayIconPath = path.join(__dirname, 'status_icon.png')
  let icon = nativeImage.createFromPath(trayIconPath)
  if (icon.isEmpty()) {
    const buf = createTrayIconPNG()
    icon = nativeImage.createFromBuffer(buf, { scaleFactor: 2.0 })
  } else {
    const traySize = IS_WIN ? 32 : 16
    icon = icon.resize({ width: traySize, height: traySize, quality: 'best' })
  }
  if (IS_MAC) icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('todoList-myfunfun')
  updateTrayMenu()

  if (IS_WIN) {
    tray.on('click', () => popupTrayMenu())
    tray.on('right-click', () => popupTrayMenu())
  }
}

function getTrayMenuStatePayload() {
  return {
    allVisible: areAllVisible(),
    openAtLogin: getOpenAtLogin(),
  }
}

function handleTrayMenuAction(action) {
  closeTrayMenuWindow()
  switch (action) {
    case 'add':
      setImmediate(() => addNewWidget())
      break
    case 'list':
      openMemoListWindow()
      break
    case 'draft-note':
      addNewDraftNote()
      break
    case 'toggle-all':
      areAllVisible() ? hideAllWidgets() : showAllWidgets()
      break
    case 'login':
      setOpenAtLogin(!getOpenAtLogin())
      updateTrayMenu()
      break
    case 'guide':
      openGuideWindow()
      break
    case 'quit':
      app.quit()
      break
    default:
      break
  }
}

function popupTrayMenu() {
  if (!tray) return
  hideTooltipWindow()
  closeTrayMenuWindow()

  const trayBounds = tray.getBounds()
  const anchor = {
    x: trayBounds.x + Math.round(trayBounds.width / 2),
    y: trayBounds.y,
  }
  trayMenuPlaceAnchor = { anchor, trayBounds }

  trayMenuWin = new BrowserWindow({
    width: TRAY_MENU_W,
    height: 220,
    frame: false,
    // Win: transparent 창은 sticky 메모보다 z-order가 낮아지는 경우가 많음
    transparent: false,
    backgroundColor: '#000000',
    hasShadow: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    focusable: true,
    type: 'popup',
    webPreferences: {
      preload: path.join(__dirname, 'tray-menu-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  applyAlwaysOnTop(trayMenuWin, true)
  trayMenuWin.setVisibleOnAllWorkspaces(false)
  trayMenuWin.loadFile(path.join(__dirname, 'tray-menu.html'))

  trayMenuWin.on('blur', () => closeTrayMenuWindow())
  trayMenuWin.on('closed', () => {
    trayMenuWin = null
    trayMenuPlaceAnchor = null
  })
}

function setupApplicationMenu() {
  if (IS_WIN) {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: '파일',
        submenu: [
          { label: '새 메모 추가', accelerator: 'CmdOrCtrl+N', click: () => setImmediate(() => addNewWidget()) },
          { label: '메모 목록', click: () => openMemoListWindow() },
          { type: 'separator' },
          { label: '사용 가이드', click: () => openGuideWindow() },
          { type: 'separator' },
          { label: '종료', accelerator: 'Alt+F4', role: 'quit' },
        ],
      },
      {
        label: '편집',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: '메모',
        submenu: [
          { label: '새 메모 추가', accelerator: 'CmdOrCtrl+N', click: () => setImmediate(() => addNewWidget()) },
          { type: 'separator' },
          { label: '메모 목록', click: () => openMemoListWindow() },
          { type: 'separator' },
          { label: '작업노트', click: () => addNewDraftNote() },
        ],
      },
    ]))
    return
  }

  if (!IS_MAC) return

  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '메모',
      submenu: [
        {
          label: '새 메모 추가',
          accelerator: 'CmdOrCtrl+N',
          click: () => setImmediate(() => addNewWidget()),
        },
        { type: 'separator' },
        { label: '메모 목록', click: () => openMemoListWindow() },
        { type: 'separator' },
        { label: '작업노트', click: () => addNewDraftNote() },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function updateTrayMenu() {
  if (!tray) return

  if (IS_WIN) {
    if (trayMenuWin && !trayMenuWin.isDestroyed()) {
      trayMenuWin.webContents.send('tray-menu-refresh')
    }
    return
  }

  const isLoginItem = getOpenAtLogin()
  const allVisible = areAllVisible()

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '새 메모 추가', accelerator: 'CmdOrCtrl+N', click: () => addNewWidget() },
    { type: 'separator' },
    { label: '메모 목록', click: () => openMemoListWindow() },
    { type: 'separator' },
    { label: '작업노트', click: () => addNewDraftNote() },
    { type: 'separator' },
    {
      label: allVisible ? '모두 숨기기' : '모두 보이기',
      click: () => { allVisible ? hideAllWidgets() : showAllWidgets() },
    },
    { type: 'separator' },
    {
      label: '로그인 시 자동 실행',
      type: 'checkbox',
      checked: isLoginItem,
      click: (item) => setOpenAtLogin(item.checked),
    },
    { type: 'separator' },
    { label: '사용 가이드', click: () => openGuideWindow() },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ]))
}

function getWidgetListPayload() {
  return [...widgetStates.entries()]
    .filter(([, state]) => !state.win.isDestroyed())
    .map(([id, state]) => ({
      id,
      title: state.data.title || '',
      visible: state.win.isVisible(),
      color: state.data.color || '#FFF176',
      alwaysOnTop: !!state.data.alwaysOnTop,
      type: state.data.type === 'draft' ? 'draft' : 'memo',
    }))
}

function notifyWidgetListUpdated() {
  if (!listWin || listWin.isDestroyed()) return
  listWin.webContents.send('widget-list-updated')
}

function openMemoListWindow() {
  if (listWin && !listWin.isDestroyed()) {
    listWin.show()
    listWin.focus()
    return
  }
  listWin = new BrowserWindow({
    width: 440,
    height: 660,
    frame: false,
    resizable: false,
    minimizable: true,
    maximizable: false,
    skipTaskbar: SKIP_WIDGET_TASKBAR,
    hasShadow: true,
    show: false,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  listWin.loadFile('memo-list.html')
  bindTooltipOwnerCleanup(listWin)
  listWin.once('ready-to-show', () => listWin.show())
  listWin.on('closed', () => { listWin = null })
}

// ───────────────────────────── 사용 가이드 창 ─────────────────────────────
let guideWin = null

function openGuideWindow() {
  if (guideWin && !guideWin.isDestroyed()) {
    guideWin.focus()
    return
  }
  guideWin = new BrowserWindow({
    width: 440,
    height: 660,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: SKIP_WIDGET_TASKBAR,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  guideWin.loadFile('guide.html')
  guideWin.on('closed', () => { guideWin = null })
}

ipcMain.on('close-guide', () => {
  if (guideWin && !guideWin.isDestroyed()) guideWin.close()
})

// ───────────────────────────── 작업노트 ─────────────────────────────
function createDraftNoteData() {
  return {
    id: `draft-${Date.now()}`,
    type: 'draft',
    title: '작업노트',
    color: getRandomBrightColor(),
    text: '',
    collapsed: false,
    alwaysOnTop: false,
    hidden: false,
    x: undefined,
    y: undefined,
  }
}

function addNewDraftNote() {
  createWidget(createDraftNoteData())
  persistAll()
  notifyWidgetListUpdated()
}

// ───────────────────────────── IPC 핸들러 ─────────────────────────────
function addNewWidget() {
  const randomColor = getRandomBrightColor()
  const newData = {
    id: `widget-${Date.now()}`,
    title: '',
    color: randomColor,
    todos: [],
    collapsed: false,
    x: undefined,
    y: undefined,
  }
  createWidget(newData)
  persistAll()
  notifyWidgetListUpdated()
}

// setImmediate로 IPC 콜스택 밖에서 생성 → V8 assertion 크래시 방지
ipcMain.on('create-widget', () => setImmediate(() => addNewWidget()))

// 재정렬·간격 계산용 높이 (접기 직후 getBounds가 아직 펼친 높이일 수 있음)
function getWidgetLayoutHeight(state) {
  if (state.data.collapsed) return WIDGET_H_COLLAPSED
  return state.data.expandedHeight ?? WIDGET_H_EXPANDED
}

function getWidgetCenterX(bounds) {
  return bounds.x + bounds.width / 2
}

function collectReflowWidgets() {
  return [...widgetStates.entries()]
    .filter(([, s]) => !s.win.isDestroyed() && !s.data.hidden)
    .map(([id, s]) => {
      const b = s.win.getBounds()
      return { id, s, b, layoutH: getWidgetLayoutHeight(s) }
    })
}

function getColumnMembersByCenterX(anchorBounds, all) {
  const anchorCx = getWidgetCenterX(anchorBounds)
  return all
    .filter((w) => Math.abs(getWidgetCenterX(w.b) - anchorCx) <= COLUMN_X_CENTER_THRESHOLD)
    .sort((a, b) => a.b.y - b.b.y)
}

function clusterWidgetsByColumn(all) {
  const sorted = [...all].sort((a, b) => getWidgetCenterX(a.b) - getWidgetCenterX(b.b))
  if (!sorted.length) return []
  const clusters = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (Math.abs(getWidgetCenterX(cur.b) - getWidgetCenterX(prev.b)) <= COLUMN_X_CENTER_THRESHOLD) {
      clusters[clusters.length - 1].push(cur)
    } else {
      clusters.push([cur])
    }
  }
  return clusters
}

// ── 같은 열의 위젯들을 빈틈 없이 재정렬 ──
function reflowColumn(changedId) {
  const anchorState = widgetStates.get(changedId)
  if (!anchorState || anchorState.win.isDestroyed()) return

  const visible = collectReflowWidgets()
  const col = getColumnMembersByCenterX(anchorState.win.getBounds(), visible)
  if (col.length <= 1) return

  let nextY = col[0].b.y   // 첫 번째 위젯의 위치는 고정

  for (const w of col) {
    const targetY = Math.round(nextY)
    const layoutH = w.layoutH
    if (Math.abs(w.b.y - targetY) > 1 || Math.abs(w.b.height - layoutH) > 1) {
      w.s.win.setBounds({ x: w.b.x, y: targetY, width: w.b.width, height: layoutH })
      w.s.data.y = targetY
      if (!w.s.data.collapsed) w.s.data.expandedHeight = layoutH
    }
    nextY += layoutH + COLUMN_GAP
  }

  persistAll()
}

function scheduleColumnReflow(widgetId) {
  const state = widgetStates.get(widgetId)
  if (!state || state.win.isDestroyed()) return

  const win = state.win
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    win.removeListener('resized', onResized)
    reflowColumn(widgetId)
  }
  const onResized = () => finish()
  const timer = setTimeout(finish, 50)
  win.once('resized', onResized)
}

function reflowAllColumnsOnStartup() {
  const visible = collectReflowWidgets()
  if (visible.length <= 1) return
  for (const col of clusterWidgetsByColumn(visible)) {
    if (col.length > 1) reflowColumn(col[0].id)
  }
}

ipcMain.on('update-widget', (event, payload) => {
  const state = widgetStates.get(payload.id)
  if (!state || state.win.isDestroyed()) return
  const { id, ...fields } = payload
  Object.assign(state.data, fields)
  if ('alwaysOnTop' in fields) {
    applyAlwaysOnTop(state.win, fields.alwaysOnTop)
    state.win.webContents.send('external-always-on-top-update', fields.alwaysOnTop)
  }
  if ('collapsed' in fields) {
    const { x, y, width, height } = state.win.getBounds()
    if (fields.collapsed) {
      if (height > WIDGET_H_COLLAPSED) state.data.expandedHeight = height
      state.win.setBounds({ x, y, width, height: WIDGET_H_COLLAPSED })
    } else {
      const expandedH = state.data.expandedHeight ?? WIDGET_H_EXPANDED
      state.win.setBounds({ x, y, width, height: expandedH })
    }
    scheduleColumnReflow(id)
  }
  if ('title' in fields) updateTrayMenu()
  persistAll()
  notifyWidgetListUpdated()
})

// X 버튼: 삭제 아님, 숨기기만
ipcMain.on('hide-widget', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    let widgetId = null
    for (const [id, state] of widgetStates) {
      if (state.win === win) {
        widgetId = id
        state.data.hidden = true
        break
      }
    }
    win.hide()
    persistAll()
    if (widgetId) scheduleColumnReflow(widgetId)
  }
  updateTrayMenu()
  notifyWidgetListUpdated()
})

// 창 배경색 변경 (색상 피커)
ipcMain.on('set-window-color', (event, color) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) win.setBackgroundColor(color)
})

// 리사이즈: 현재 창 bounds 반환
ipcMain.handle('get-window-bounds', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win && !win.isDestroyed() ? win.getBounds() : null
})

ipcMain.handle('tray-menu-get-state', () => getTrayMenuStatePayload())

ipcMain.on('tray-menu-action', (_event, action) => {
  handleTrayMenuAction(action)
})

ipcMain.on('tray-menu-close', () => {
  closeTrayMenuWindow()
})

ipcMain.on('tray-menu-resize', (event, height) => {
  if (!trayMenuWin || trayMenuWin.isDestroyed()) return
  if (event.sender !== trayMenuWin.webContents) return
  placeTrayMenuWindow(height)
})

ipcMain.on('show-tooltip', async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return
  try {
    hideTooltipWindow()
    await showTooltipWindow(win, payload)
  } catch (e) {
    console.error('툴팁 표시 실패:', e)
    hideTooltipWindow()
  }
})

ipcMain.on('hide-tooltip', () => {
  hideTooltipWindow()
})

// 리사이즈: 새 bounds 적용 + state 즉시 반영
ipcMain.on('set-window-bounds', (event, bounds) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return
  win.setBounds(bounds)
  // setBounds()는 'resized' 이벤트를 발생시키지 않으므로 직접 state 갱신
  for (const [, state] of widgetStates) {
    if (state.win === win) {
      state.data.x = bounds.x
      state.data.y = bounds.y
      state.data.width = bounds.width
      if (!state.data.collapsed) state.data.expandedHeight = bounds.height
      break
    }
  }
})

// 리사이즈 완료: 드래그 끝날 때 한 번만 디스크에 저장
ipcMain.on('resize-done', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return
  for (const [id, state] of widgetStates) {
    if (state.win === win) { saveWindowBounds(id, win); break }
  }
})

// 타이틀바 드래그 시 해당 위젯을 z-order 최상단으로
ipcMain.on('focus-widget', (event, widgetId) => {
  const state = widgetStates.get(widgetId)
  if (state && !state.win.isDestroyed()) state.win.moveTop()
})

ipcMain.handle('get-widget-list', () => {
  return getWidgetListPayload()
})

ipcMain.handle('toggle-widget-visibility', (_event, widgetId) => {
  const state = widgetStates.get(widgetId)
  if (!state || state.win.isDestroyed()) return false
  if (state.win.isVisible()) {
    state.win.hide()
    state.data.hidden = true
  } else {
    state.win.show()
    state.win.focus()
    state.data.hidden = false
  }
  persistAll()
  updateTrayMenu()
  notifyWidgetListUpdated()
  return true
})

ipcMain.handle('rename-widget-title', (_event, payload) => {
  const { id, title } = payload || {}
  const state = widgetStates.get(id)
  if (!state || state.win.isDestroyed()) return false
  state.data.title = (title || '').trim()
  state.win.webContents.send('external-title-update', state.data.title)
  persistAll()
  updateTrayMenu()
  notifyWidgetListUpdated()
  return true
})

ipcMain.handle('delete-widget-by-id', (_event, widgetId) => {
  hideTooltipWindow()
  const state = widgetStates.get(widgetId)
  if (!state) return false
  if (!state.win.isDestroyed()) state.win.close()
  widgetStates.delete(widgetId)
  persistAll()
  updateTrayMenu()
  notifyWidgetListUpdated()
  return true
})

// ───────────────────────────── 앱 시작 ─────────────────────────────
app.whenReady().then(() => {
  configureAppPresentation()

  setupApplicationMenu()
  setupTray()

  // 패키징된 앱의 최초 실행 시 → 로그인 항목 자동 등록
  if (app.isPackaged && !fs.existsSync(INIT_FLAG)) {
    setOpenAtLogin(true)
    try {
      fs.mkdirSync(path.dirname(INIT_FLAG), { recursive: true })
      fs.writeFileSync(INIT_FLAG, '1')
    } catch (e) {}
  }

  let savedWidgets = loadData()
  if (savedWidgets.length === 0) {
    savedWidgets = [{
      id: `widget-${Date.now()}`,
      title: '오늘 할 일',
      color: COLORS[0],
      todos: [],
      collapsed: false,
      x: undefined,
      y: undefined,
    }]
  }
  if (!savedWidgets.some((w) => w.type === 'draft')) {
    savedWidgets.push(createDraftNoteData())
  }
  savedWidgets.forEach((data) => createWidget(data))
  persistAll()
  if (savedWidgets.length > 1) {
    setTimeout(() => reflowAllColumnsOnStartup(), 150)
  }
})

app.on('window-all-closed', () => { /* 트레이 앱 유지 */ })
app.on('before-quit', () => persistAll())
