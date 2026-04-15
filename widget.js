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
const $btnAddWidget      = document.getElementById('btn-add-widget')
const $btnClose          = document.getElementById('btn-close')
const $btnClear          = document.getElementById('btn-clear')
const $btnPalette  = document.getElementById('btn-palette')
const $colorInput  = document.getElementById('color-input')
const $memoDesc    = document.getElementById('memo-desc')

// ───────────────────────────── 초기화 ─────────────────────────────
window.api.onInitWidget((data) => {
  widgetData = data
  applyColor(data.color)
  renderTitle(data.title)

  $colorInput.value = data.color
  $memoDesc.value = data.desc || ''
  // 로드 시 저장된 내용에 맞게 높이 복원 (DOM 렌더 후)
  requestAnimationFrame(resizeDesc)

  if (data.collapsed) {
    $widget.classList.add('collapsed')
  }

  data.todos.forEach((todo) => appendTodoItem(todo))
})

// ───────────────────────────── 색상 적용 ─────────────────────────────
function applyColor(color) {
  document.documentElement.style.setProperty('--widget-color', color)
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

// ───────────────────────────── 타이틀 편집 (클릭 → 편집 모드) ─────────────────────────────
$title.addEventListener('click', (e) => {
  e.stopPropagation()
  if ($title.contentEditable !== 'true') {
    $title.contentEditable = 'true'
    if ($title.classList.contains('is-placeholder')) {
      $title.textContent = ''
      $title.classList.remove('is-placeholder')
    }
    $title.focus()
  }
})

$title.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $title.blur() }
  if (e.key === 'Escape') { renderTitle(widgetData.title); $title.contentEditable = 'false' }
})

$title.addEventListener('blur', () => {
  $title.contentEditable = 'false'
  const newTitle = $title.textContent.trim()
  widgetData.title = newTitle
  renderTitle(newTitle)
  sync({ title: newTitle })
})

// ───────────────────────────── 접기/펼치기 (▾ 버튼 클릭) ─────────────────────────────

// 타이틀바 누를 때 이 위젯을 최상단으로 올림
$titlebar.addEventListener('mousedown', () => {
  if (widgetData) window.api.focusWidget(widgetData.id)
})

$btnCollapse.addEventListener('click', () => toggleCollapse())

function toggleCollapse() {
  widgetData.collapsed = !widgetData.collapsed
  $widget.classList.toggle('collapsed', widgetData.collapsed)
  sync({ collapsed: widgetData.collapsed })
}

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
  if (e.key === 'Enter' && !e.isComposing) addTodo()
})

// ───────────────────────────── 할일 아이템 DOM 생성 ─────────────────────────────
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

// ───────────────────────────── 완료 항목 일괄 삭제 ─────────────────────────────
$btnClear.addEventListener('click', () => {
  widgetData.todos = widgetData.todos.filter((t) => !t.done)
  // DOM 갱신
  $todoList.querySelectorAll('.todo-item.done').forEach((el) => el.remove())
  sync({ todos: widgetData.todos })
})

// ───────────────────────────── 컬러 피커 (네이티브) ─────────────────────────────
$btnPalette.addEventListener('click', (e) => {
  e.stopPropagation()
  $colorInput.click()
})

$colorInput.addEventListener('input', (e) => {
  const color = e.target.value
  applyColor(color)
  widgetData.color = color
  window.api.setWindowColor(color)
})

// ───────────────────────────── 개요 자동높이 + 저장 ─────────────────────────────
function resizeDesc() {
  $memoDesc.style.height = '1px'
  const full = $memoDesc.scrollHeight
  $memoDesc.style.height = Math.min(full, 140) + 'px'
  $memoDesc.style.overflowY = full > 140 ? 'auto' : 'hidden'
}

$memoDesc.addEventListener('input', () => {
  resizeDesc()
  widgetData.desc = $memoDesc.value
})
$memoDesc.addEventListener('blur', () => {
  sync({ desc: $memoDesc.value })
})

$colorInput.addEventListener('change', (e) => {
  const color = e.target.value
  widgetData.color = color
  sync({ color })
})

// ───────────────────────────── 새 위젯 추가 ─────────────────────────────
$btnAddWidget.addEventListener('click', () => {
  window.api.createWidget()
})

// ───────────────────────────── 위젯 닫기 ─────────────────────────────
$btnClose.addEventListener('click', () => {
  window.api.hideWidget()
})

// ───────────────────────────── 리사이즈 핸들 ─────────────────────────────
document.querySelectorAll('.resize-handle').forEach((el) => {
  el.addEventListener('pointerdown', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    el.setPointerCapture(e.pointerId)

    const edge = el.dataset.edge
    const startX = e.screenX
    const startY = e.screenY

    // await 중 pointerup이 먼저 오면 취소 처리
    let cancelled = false
    const onEarlyUp = () => { cancelled = true }
    el.addEventListener('pointerup', onEarlyUp, { once: true })

    const sb = await window.api.getWindowBounds()

    el.removeEventListener('pointerup', onEarlyUp)
    if (!sb || cancelled) return   // 이미 손을 뗐으면 아무것도 하지 않음

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
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', () => {
      el.removeEventListener('pointermove', onMove)
      el.releasePointerCapture(e.pointerId)
      window.api.resizeDone()
    }, { once: true })
  })
})

// ───────────────────────────── 상태 동기화 ─────────────────────────────
function sync(fields) {
  if (!widgetData) return
  window.api.updateWidget({ id: widgetData.id, ...fields })
}
