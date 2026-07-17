/**
 * widget.js — 렌더러 프로세스
 * main.js 로부터 init-widget 이벤트로 초기 데이터를 받아 UI를 구성하고,
 * 사용자 조작마다 update-widget IPC로 상태를 동기화한다.
 */

// ───────────────────────────── 상태 ─────────────────────────────
let widgetData = null   // { id, title, color, todos: [{id, text, done}], collapsed }

// ───────────────────────────── DOM ─────────────────────────────
const $widget      = document.getElementById('widget')
const $titlebar    = document.getElementById('titlebar')
const $title       = document.getElementById('title')
const $btnCollapse = document.getElementById('btn-collapse')
const $body        = document.getElementById('body')
const $todoList  = document.getElementById('todo-list')
const $newTodo   = document.getElementById('new-todo')
const $btnAddTodo   = document.getElementById('btn-add-todo')
const $btnClose          = document.getElementById('btn-close')
const $btnClear          = document.getElementById('btn-clear')
const $btnMore     = document.getElementById('btn-more')
const $btnFloat    = document.getElementById('btn-float')
const $btnAddWidget = document.getElementById('btn-add-widget')
const $btnPalette  = document.getElementById('btn-palette')
const $moreMenu    = document.getElementById('more-menu')
const $moreAdd     = document.getElementById('more-add')
const $moreColor   = document.getElementById('more-color')
const $moreFloat   = document.getElementById('more-float')
const $moreDelete  = document.getElementById('more-delete')
const $ctxMenu     = document.getElementById('ctx-menu')
const $colorInput  = document.getElementById('color-input')
const $memoDesc    = document.getElementById('memo-desc')
const $draftText   = document.getElementById('draft-text')

/** 넓은 창에서만 타이틀바 아이콘 펼침 (중간 크기는 ⋮ 유지) */
const TITLEBAR_EXPAND_MIN_WIDTH = 400

/** macOS 스타일 panel 툴팁 (main.js 공유 창 1개) */
const TOOLTIP_DELAY_MS = 400
let tooltipTimer = null
let tooltipHoverEl = null
let tooltipRequestId = 0

// ───────────────────────────── 더보기 메뉴 ─────────────────────────────
function isMoreMenuOpen() {
  return $moreMenu && !$moreMenu.hidden
}

function openMoreMenu() {
  $moreMenu.hidden = false
  $btnMore.classList.add('is-open')
  $btnMore.setAttribute('aria-expanded', 'true')
}

function closeMoreMenu() {
  if ($moreMenu.hidden) return
  $moreMenu.hidden = true
  $btnMore.classList.remove('is-open')
  $btnMore.setAttribute('aria-expanded', 'false')
}

function isContextMenuOpen() {
  return $ctxMenu && !$ctxMenu.hidden
}

function closeContextMenu() {
  if (!$ctxMenu || $ctxMenu.hidden) return
  $ctxMenu.hidden = true
}

function closeAllMenus() {
  closeMoreMenu()
  closeContextMenu()
}

function syncMenuFloatState() {
  const isActive = !!(widgetData && widgetData.alwaysOnTop)
  $moreFloat.classList.toggle('is-active', isActive)
  const floatBtn = $ctxMenu?.querySelector('[data-action="float"]')
  if (floatBtn) floatBtn.classList.toggle('is-active', isActive)
}

async function runMenuAction(action) {
  if (!widgetData) return
  if (widgetData.type === 'draft' && action === 'add') return
  switch (action) {
    case 'add':
      closeAllMenus()
      window.api.createWidget()
      break
    case 'color':
      closeAllMenus()
      $colorInput.click()
      break
    case 'float':
      toggleAlwaysOnTop()
      closeAllMenus()
      break
    case 'delete': {
      closeAllMenus()
      const ok = window.confirm('이 메모를 삭제할까요?')
      if (!ok) return
      await window.api.deleteWidgetById(widgetData.id)
      break
    }
    default:
      break
  }
}

function isTitlebarExpanded() {
  return document.body.classList.contains('titlebar-expanded')
}

function updateTitlebarLayout() {
  const expanded = window.innerWidth >= TITLEBAR_EXPAND_MIN_WIDTH
  document.body.classList.toggle('titlebar-expanded', expanded)
  if (expanded && isMoreMenuOpen()) closeMoreMenu()
  if (widgetData) updateAlwaysOnTopUI(!!widgetData.alwaysOnTop)
}

function updateAlwaysOnTopUI(isActive) {
  syncMenuFloatState()
  $btnFloat.classList.toggle('active', isActive)
  if (isTitlebarExpanded()) {
    $btnFloat.hidden = false
  } else {
    $btnFloat.hidden = !isActive
  }
}

function toggleAlwaysOnTop() {
  if (!widgetData) return
  const isActive = !widgetData.alwaysOnTop
  widgetData.alwaysOnTop = isActive
  updateAlwaysOnTopUI(isActive)
  sync({ alwaysOnTop: isActive })
}

// ───────────────────────────── 초기화 ─────────────────────────────
window.api.onInitWidget((data) => {
  widgetData = data
  if (window.api.getPlatform?.() === 'win32') {
    document.body.classList.add('platform-win32')
  }
  applyColor(data.color)
  renderTitle(data.title)

  $colorInput.value = data.color

  const isDraft = data.type === 'draft'
  document.body.classList.toggle('is-draft-note', isDraft)

  if (isDraft) {
    // 과거 데이터는 textarea 시절 순수 텍스트, 서식 적용 후에는 HTML(볼드/취소선/하이라이트 태그) —
    // '<' 포함 여부로 구분해 순수 텍스트는 이스케이프해서 넣는다.
    const savedText = data.text || ''
    if (savedText.includes('<')) {
      $draftText.innerHTML = savedText
    } else {
      $draftText.textContent = savedText
    }
  } else {
    $memoDesc.value = data.desc || ''
    if (!data.collapsed) scheduleResizeDesc()
    data.todos.forEach((todo) => appendTodoItem(todo))
  }

  if (data.collapsed) {
    $widget.classList.add('collapsed')
  }

  updateAlwaysOnTopUI(!!data.alwaysOnTop)
  updateTitlebarLayout()
})

window.addEventListener('resize', updateTitlebarLayout)
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(updateTitlebarLayout).observe(document.documentElement)
}

function setupNativeTooltips() {
  document.querySelectorAll('[data-tooltip]').forEach((el) => {
    if (!el.closest('.widget')) return
    el.addEventListener('mouseenter', onTooltipMouseEnter)
    el.addEventListener('mouseleave', onTooltipMouseLeave)
  })
}

function onTooltipMouseEnter(e) {
  const el = e.currentTarget
  const text = el.getAttribute('data-tooltip')
  if (!text) return

  if (tooltipHoverEl !== el) {
    clearTimeout(tooltipTimer)
    tooltipRequestId++
    window.api.hideTooltip()
  }

  tooltipHoverEl = el
  const requestId = ++tooltipRequestId

  tooltipTimer = setTimeout(() => {
    if (tooltipHoverEl !== el || requestId !== tooltipRequestId) return
    showNativeTooltipFor(el, text, requestId)
  }, TOOLTIP_DELAY_MS)
}

function onTooltipMouseLeave(e) {
  const el = e.currentTarget
  if (tooltipHoverEl === el) tooltipHoverEl = null
  clearTimeout(tooltipTimer)
  tooltipRequestId++
  window.api.hideTooltip()
}

async function showNativeTooltipFor(el, text, requestId) {
  if (requestId !== tooltipRequestId || tooltipHoverEl !== el) return

  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  window.api.showTooltip({
    anchorLeft: rect.left,
    anchorTop: rect.top,
    anchorWidth: rect.width,
    anchorHeight: rect.height,
    text,
    // 타이틀바 아이콘: 도크처럼 버튼 위쪽에 표시 (본문 쪽으로 길게 내려가지 않음)
    preferBelow: false,
  })
}

setupNativeTooltips()

// ───────────────────────────── 색상 적용 ─────────────────────────────
function applyColor(color) {
  document.documentElement.style.setProperty('--widget-color', color)
  document.body.classList.toggle('low-light', isLowLightColor(color))
}

function isLowLightColor(hexColor) {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return false
  const { l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return l <= 80
}

function hexToRgb(hexColor) {
  const hex = hexColor.replace('#', '')
  const normalized = hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHsl(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  const l = (max + min) / 2
  let s = 0

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2)
    else h = 60 * ((rn - gn) / delta + 4)
  }

  if (h < 0) h += 360
  return { h, s: s * 100, l: l * 100 }
}

// ───────────────────────────── 타이틀 렌더 (빈 제목 → 플레이스홀더) ─────────────────────────────
function renderTitle(text) {
  if (!text) {
    $title.textContent = '제목'
    $title.classList.add('is-placeholder')
  } else {
    $title.textContent = text
    $title.classList.remove('is-placeholder')
  }
}

function exitTitleEditMode() {
  $title.contentEditable = 'false'
  $title.scrollLeft = 0
}

function handleClipboardShortcut(e, target) {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return false
  const key = e.key.toLowerCase()
  if (key === 'a') return false

  if (key === 'c' || key === 'x') {
    document.execCommand(key === 'c' ? 'copy' : 'cut')
    e.preventDefault()
    return true
  }

  if (key === 'v') {
    e.preventDefault()
    // execCommand('insertText')는 input/textarea·contentEditable 모두에서 동작하며,
    // target.value를 직접 대입하는 방식과 달리 브라우저 undo 스택을 보존한다.
    navigator.clipboard.readText().then((text) => {
      if (!text) return
      document.execCommand('insertText', false, text)
    }).catch(() => {})
    return true
  }

  return false
}

const DRAFT_HIGHLIGHT_COLOR = '#fff59d'
const DRAFT_HIGHLIGHT_RGB = 'rgb(255, 245, 157)'

/** 작업노트 전용 서식 단축키: Cmd/Ctrl+B 볼드, +Shift+X 취소선, +Shift+H 하이라이트 */
function handleFormatShortcut(e) {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return false
  const key = e.key.toLowerCase()

  if (key === 'b' && !e.shiftKey) {
    document.execCommand('bold')
    e.preventDefault()
    return true
  }

  if (key === 'x' && e.shiftKey) {
    document.execCommand('strikeThrough')
    e.preventDefault()
    return true
  }

  if (key === 'h' && e.shiftKey) {
    // 작업노트 배경 자체가 반투명 회색이라 queryCommandValue가 그 배경을 "배경 있음"으로
    // 잘못 잡는 경우가 있어, "직접 적용한 하이라이트 색과 일치하는지"만 비교한다.
    const current = document.queryCommandValue('backColor')
    const isHighlighted = current === DRAFT_HIGHLIGHT_RGB
    document.execCommand('hiliteColor', false, isHighlighted ? 'transparent' : DRAFT_HIGHLIGHT_COLOR)
    e.preventDefault()
    return true
  }

  return false
}

function enterTitleEditMode() {
  if ($title.contentEditable === 'true') return
  $title.contentEditable = 'true'
  if ($title.classList.contains('is-placeholder')) {
    $title.textContent = ''
    $title.classList.remove('is-placeholder')
  }
  $title.focus()
}

$title.addEventListener('mousedown', (e) => {
  e.stopPropagation()
})

$title.addEventListener('click', (e) => {
  e.stopPropagation()
  enterTitleEditMode()
})

window.api.onStartTitleEdit(() => {
  enterTitleEditMode()
})

window.api.onExternalTitleUpdate((newTitle) => {
  widgetData.title = (newTitle || '').trim()
  renderTitle(widgetData.title)
})

window.api.onExternalAlwaysOnTopUpdate((value) => {
  if (widgetData) {
    widgetData.alwaysOnTop = value
    updateAlwaysOnTopUI(value)
  }
})

$title.addEventListener('keydown', (e) => {
  if (handleClipboardShortcut(e, $title)) return
  if (e.isComposing) return
  if (e.key === 'Enter') { e.preventDefault(); $title.blur() }
  if (e.key === 'Escape') {
    renderTitle(widgetData.title)
    exitTitleEditMode()
  }
  if ($title.contentEditable === 'true' && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault()
    document.execCommand('selectAll')
  }
})

$title.addEventListener('blur', () => {
  const newTitle = $title.textContent.trim()
  widgetData.title = newTitle
  renderTitle(newTitle)
  sync({ title: newTitle })
  exitTitleEditMode()
})

// ───────────────────────────── 접기/펼치기 (▾ 버튼 클릭) ─────────────────────────────

$titlebar.addEventListener('mousedown', () => {
  if (widgetData) window.api.focusWidget(widgetData.id)
})

$btnCollapse.addEventListener('click', () => toggleCollapse())

function toggleCollapse() {
  widgetData.collapsed = !widgetData.collapsed
  $widget.classList.toggle('collapsed', widgetData.collapsed)
  if (widgetData.collapsed) closeAllMenus()
  else scheduleResizeDesc()
  sync({ collapsed: widgetData.collapsed })
}

// ───────────────────────────── 더보기 메뉴 이벤트 ─────────────────────────────
$btnMore.addEventListener('click', (e) => {
  e.stopPropagation()
  if (isMoreMenuOpen()) closeMoreMenu()
  else openMoreMenu()
})

function bindMenuItem(el, action) {
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    runMenuAction(action)
  })
}

bindMenuItem($moreAdd, 'add')
bindMenuItem($moreColor, 'color')
bindMenuItem($moreDelete, 'delete')
bindMenuItem($moreFloat, 'float')

$ctxMenu?.querySelectorAll('[data-action]').forEach((el) => {
  bindMenuItem(el, el.dataset.action)
})

$btnFloat.addEventListener('click', (e) => {
  e.stopPropagation()
  toggleAlwaysOnTop()
})

$btnPalette.addEventListener('click', (e) => {
  e.stopPropagation()
  $colorInput.click()
})

$btnAddWidget.addEventListener('click', (e) => {
  e.stopPropagation()
  window.api.createWidget()
})

function canShowBodyContextMenu(target) {
  if (!$widget || $widget.classList.contains('collapsed')) return false
  if (target.closest('#titlebar, .resize-handle, .more-menu, .ctx-menu, #titlebar-more')) return false
  if (target.closest('.todo-item, .input-row, .memo-desc, .footer, #new-todo, .btn-add-todo, .btn-clear, .draft-text')) {
    return false
  }
  return target.closest('#widget')
}

function openContextMenu(clientX, clientY) {
  closeMoreMenu()
  syncMenuFloatState()
  $ctxMenu.hidden = false
  $ctxMenu.style.visibility = 'hidden'
  $ctxMenu.style.left = '0px'
  $ctxMenu.style.top = '0px'

  requestAnimationFrame(() => {
    const pad = 6
    const w = $ctxMenu.offsetWidth
    const h = $ctxMenu.offsetHeight
    const x = Math.max(pad, Math.min(clientX, window.innerWidth - w - pad))
    const y = Math.max(pad, Math.min(clientY, window.innerHeight - h - pad))
    $ctxMenu.style.left = `${x}px`
    $ctxMenu.style.top = `${y}px`
    $ctxMenu.style.visibility = 'visible'
  })
}

$widget.addEventListener('contextmenu', (e) => {
  if (!canShowBodyContextMenu(e.target)) return
  e.preventDefault()
  openContextMenu(e.clientX, e.clientY)
})

document.addEventListener('mousedown', (e) => {
  if (isContextMenuOpen() && !e.target.closest('#ctx-menu')) closeContextMenu()
  if (!isMoreMenuOpen()) return
  if (e.target.closest('#titlebar-more')) return
  closeMoreMenu()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (isMoreMenuOpen() || isContextMenuOpen())) {
    e.stopPropagation()
    closeAllMenus()
  }
})

// ───────────────────────────── 할일 추가 ─────────────────────────────
function addTodo() {
  const text = $newTodo.value.trim()
  if (!text) return

  const todo = { id: `todo-${Date.now()}-${Math.random().toString(36).slice(2)}`, text, done: false }
  widgetData.todos.push(todo)
  appendTodoItem(todo)
  $newTodo.value = ''
  sync({ todos: widgetData.todos })
}

$btnAddTodo.addEventListener('click', addTodo)

$newTodo.addEventListener('keydown', (e) => {
  if (handleClipboardShortcut(e, $newTodo)) return
  if (e.key === 'Enter' && !e.isComposing) addTodo()
})

function appendTodoItem(todo) {
  const li = document.createElement('li')
  li.className = 'todo-item' + (todo.done ? ' done' : '')
  li.dataset.id = todo.id

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = todo.done
  checkbox.addEventListener('change', () => {
    todo.done = checkbox.checked
    li.classList.toggle('done', todo.done)
    sync({ todos: widgetData.todos })
  })

  const label = document.createElement('span')
  label.className = 'todo-label'
  label.textContent = todo.text

  label.addEventListener('dblclick', (e) => {
    e.stopPropagation()
    label.contentEditable = 'true'
    label.focus()
    const range = document.createRange()
    range.selectNodeContents(label)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  })

  label.addEventListener('keydown', (e) => {
    if (e.isComposing) return
    if (e.key === 'Enter') { e.preventDefault(); label.blur() }
    if (e.key === 'Escape') { label.textContent = todo.text; label.contentEditable = 'false' }
  })

  label.addEventListener('blur', () => {
    label.contentEditable = 'false'
    const newText = label.textContent.trim()
    if (newText && newText !== todo.text) {
      todo.text = newText
      sync({ todos: widgetData.todos })
    } else {
      label.textContent = todo.text
    }
  })

  const btnRemove = document.createElement('button')
  btnRemove.className = 'btn-remove-item'
  btnRemove.textContent = '✕'
  btnRemove.title = '삭제'
  btnRemove.addEventListener('click', () => {
    widgetData.todos = widgetData.todos.filter((t) => t.id !== todo.id)
    li.remove()
    sync({ todos: widgetData.todos })
  })

  li.appendChild(checkbox)
  li.appendChild(label)
  li.appendChild(btnRemove)
  $todoList.appendChild(li)
}

$btnClear.addEventListener('click', () => {
  widgetData.todos = widgetData.todos.filter((t) => !t.done)
  $todoList.querySelectorAll('.todo-item.done').forEach((el) => el.remove())
  sync({ todos: widgetData.todos })
})

$colorInput.addEventListener('input', (e) => {
  const color = e.target.value
  applyColor(color)
  widgetData.color = color
  window.api.setWindowColor(color)
})

$colorInput.addEventListener('change', (e) => {
  const color = e.target.value
  widgetData.color = color
  sync({ color })
})

function resizeDesc() {
  if ($widget.classList.contains('collapsed')) return
  $memoDesc.style.height = '1px'
  const full = $memoDesc.scrollHeight
  $memoDesc.style.height = Math.min(full, 140) + 'px'
  $memoDesc.style.overflowY = full > 140 ? 'auto' : 'hidden'
}

function scheduleResizeDesc() {
  if ($widget.classList.contains('collapsed')) return
  requestAnimationFrame(() => {
    requestAnimationFrame(() => resizeDesc())
  })
}

$memoDesc.addEventListener('input', () => {
  resizeDesc()
  widgetData.desc = $memoDesc.value
})
$memoDesc.addEventListener('blur', () => {
  sync({ desc: $memoDesc.value })
})

function normalizeDraftEmptyState() {
  // Chromium은 contenteditable을 전부 지워도 <br> 하나가 남는 경우가 있어
  // :empty CSS(플레이스홀더 표시)가 먹지 않는다 — 완전히 비었으면 innerHTML도 비운다.
  if ($draftText.textContent.trim() === '') $draftText.innerHTML = ''
}

$draftText.addEventListener('input', () => {
  widgetData.text = $draftText.innerHTML
})
$draftText.addEventListener('blur', () => {
  normalizeDraftEmptyState()
  sync({ text: $draftText.innerHTML })
})
$draftText.addEventListener('keydown', (e) => {
  if (handleFormatShortcut(e)) return
  handleClipboardShortcut(e, $draftText)
})

$btnClose.addEventListener('click', () => {
  window.api.hideWidget()
})

document.querySelectorAll('.resize-handle').forEach((el) => {
  el.addEventListener('pointerdown', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    el.setPointerCapture(e.pointerId)

    const edge = el.dataset.edge
    const startX = e.screenX
    const startY = e.screenY

    let cancelled = false
    const onEarlyUp = () => { cancelled = true }
    el.addEventListener('pointerup', onEarlyUp, { once: true })

    const sb = await window.api.getWindowBounds()

    el.removeEventListener('pointerup', onEarlyUp)
    if (!sb || cancelled) return

    function onMove(me) {
      const dx = me.screenX - startX
      const dy = me.screenY - startY
      const b = { x: sb.x, y: sb.y, width: sb.width, height: sb.height }

      if (edge === 'right'        || edge === 'bottom-right') b.width  = Math.max(260, sb.width + dx)
      if (edge === 'bottom'       || edge === 'bottom-right' || edge === 'bottom-left') b.height = Math.max(44, sb.height + dy)
      if (edge === 'left'         || edge === 'bottom-left') {
        const w = Math.max(260, sb.width - dx)
        b.x = sb.x + (sb.width - w)
        b.width = w
      }

      window.api.setWindowBounds(b)
      updateTitlebarLayout()
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', () => {
      el.removeEventListener('pointermove', onMove)
      el.releasePointerCapture(e.pointerId)
      window.api.resizeDone()
    }, { once: true })
  })
})

function sync(fields) {
  if (!widgetData) return
  window.api.updateWidget({ id: widgetData.id, ...fields })
}
