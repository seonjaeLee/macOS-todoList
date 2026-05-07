const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const zlib = require('zlib')

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

// Dock 아이콘은 whenReady 이후에 커스텀 이미지로 표시

// ───────────────────────────── 데이터 저장 경로 ─────────────────────────────
const DATA_FILE = path.join(app.getPath('userData'), 'widgets.json')
const INIT_FLAG  = path.join(app.getPath('userData'), '.initialized')

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch (e) { console.error('데이터 로드 실패:', e) }
  return []
}

function saveData(widgets) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(widgets, null, 2), 'utf-8')
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
let listWin = null

const COLORS = ['#FFF176', '#FFD54F', '#80DEEA', '#EF9A9A', '#CE93D8', '#A5D6A7']
const WIDGET_W = 260
const WIDGET_H_EXPANDED = 340
const WIDGET_H_COLLAPSED = 44

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
    resizable: true,
    skipTaskbar: true,
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

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
  win.loadFile('widget.html')

  win.webContents.once('did-finish-load', () => {
    win.webContents.send('init-widget', data)
    if (!data.hidden) { win.show(); updateTrayMenu() }
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
  widgetStates.forEach(({ win, data }) => { if (!win.isDestroyed()) { win.show(); data.hidden = false } })
  persistAll()
  updateTrayMenu()
  notifyWidgetListUpdated()
}

function hideAllWidgets() {
  widgetStates.forEach(({ win, data }) => { if (!win.isDestroyed()) { win.hide(); data.hidden = true } })
  persistAll()
  updateTrayMenu()
  notifyWidgetListUpdated()
}

// ───────────────────────────── 트레이 ─────────────────────────────
function setupTray() {
  const buf = createTrayIconPNG()
  const icon = nativeImage.createFromBuffer(buf, { scaleFactor: 2.0 })
  icon.setTemplateImage(true) // macOS 라이트/다크 모드 자동 대응

  tray = new Tray(icon)
  tray.setToolTip('Desktop Todo')
  updateTrayMenu()
}

function updateTrayMenu() {
  if (!tray) return

  const isLoginItem = app.getLoginItemSettings().openAtLogin
  const allVisible = areAllVisible()

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '새 메모 추가', click: () => addNewWidget() },
    { type: 'separator' },
    { label: '메모 목록 열기', click: () => openMemoListWindow() },
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
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
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
    skipTaskbar: true,
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
    skipTaskbar: true,
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

// ── 같은 열의 위젯들을 빈틈 없이 재정렬 ──
function reflowColumn(changedId) {
  const all = [...widgetStates.entries()]
    .filter(([, s]) => !s.win.isDestroyed())
    .map(([id, s]) => ({ id, s, b: s.win.getBounds() }))

  const anchor = all.find((w) => w.id === changedId)
  if (!anchor) return

  // x 범위가 겹치는 위젯을 같은 열로 간주
  const aL = anchor.b.x, aR = anchor.b.x + anchor.b.width
  const col = all
    .filter((w) => Math.max(aL, w.b.x) < Math.min(aR, w.b.x + w.b.width))
    .sort((a, b) => a.b.y - b.b.y)

  if (col.length <= 1) return

  const GAP = 6
  let nextY = col[0].b.y   // 첫 번째 위젯의 위치는 고정

  for (const w of col) {
    const targetY = Math.round(nextY)
    if (Math.abs(w.b.y - targetY) > 1) {
      w.s.win.setBounds({ x: w.b.x, y: targetY, width: w.b.width, height: w.b.height })
      w.s.data.y = targetY
    }
    nextY += w.b.height + GAP
  }

  persistAll()
}

ipcMain.on('update-widget', (event, payload) => {
  const state = widgetStates.get(payload.id)
  if (!state || state.win.isDestroyed()) return
  const { id, ...fields } = payload
  Object.assign(state.data, fields)
  if ('collapsed' in fields) {
    const { x, y, width, height } = state.win.getBounds()
    if (fields.collapsed) {
      state.data.expandedHeight = height  // 현재 높이 저장
      state.win.setBounds({ x, y, width, height: WIDGET_H_COLLAPSED })
    } else {
      const expandedH = state.data.expandedHeight ?? WIDGET_H_EXPANDED
      state.win.setBounds({ x, y, width, height: expandedH })
    }
    // 높이 변경 후 같은 열 위젯들 재정렬
    setImmediate(() => reflowColumn(id))
  }
  if ('title' in fields) updateTrayMenu()
  persistAll()
  notifyWidgetListUpdated()
})

// X 버튼: 삭제 아님, 숨기기만
ipcMain.on('hide-widget', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.hide()
    for (const [, state] of widgetStates) {
      if (state.win === win) { state.data.hidden = true; break }
    }
    persistAll()
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
  if (app.dock) {
    app.dock.show()
    if (!app.isPackaged) {
      const devDockIconPath = path.join(__dirname, 'build', 'icon.png')
      const devDockIcon = nativeImage.createFromPath(devDockIconPath)
      if (!devDockIcon.isEmpty()) app.dock.setIcon(devDockIcon)
    }
  }

  setupTray()

  // 패키징된 앱의 최초 실행 시 → 로그인 항목 자동 등록
  if (app.isPackaged && !fs.existsSync(INIT_FLAG)) {
    app.setLoginItemSettings({ openAtLogin: true })
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
  savedWidgets.forEach((data) => createWidget(data))
})

app.on('window-all-closed', () => { /* 트레이 앱 유지 */ })
app.on('before-quit', () => persistAll())
