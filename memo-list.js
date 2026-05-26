const $list = document.getElementById('list')
const $btnClose = document.getElementById('btn-close')

$btnClose.addEventListener('click', () => window.close())

/** macOS 스타일 panel 툴팁 (메모 위젯·main.js 공유) */
const TOOLTIP_DELAY_MS = 400
let tooltipTimer = null
let tooltipHoverEl = null
let tooltipRequestId = 0

function onTooltipMouseEnter(e) {
  const el = e.currentTarget
  const text = el.getAttribute('data-tooltip')
  if (!text) return

  tooltipHoverEl = el
  clearTimeout(tooltipTimer)
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
    preferBelow: false,
  })
}

function bindPanelTooltips(root) {
  root.querySelectorAll('[data-tooltip]').forEach((el) => {
    el.addEventListener('mouseenter', onTooltipMouseEnter)
    el.addEventListener('mouseleave', onTooltipMouseLeave)
  })
}

function toHexChannel(value) {
  return value.toString(16).padStart(2, '0')
}

function getSlightlyDarkerColor(hexColor, amount = 0.14) {
  const raw = (hexColor || '').replace('#', '')
  const normalized = raw.length === 3
    ? raw.split('').map((ch) => ch + ch).join('')
    : raw

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return 'rgba(0, 0, 0, 0.3)'

  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)

  const darken = (channel) => Math.max(0, Math.round(channel * (1 - amount)))
  return `#${toHexChannel(darken(r))}${toHexChannel(darken(g))}${toHexChannel(darken(b))}`
}

async function renderList() {
  window.api.hideTooltip()
  const widgets = await window.api.getWidgetList()
  $list.innerHTML = ''

  if (!widgets.length) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = '메모가 없습니다.'
    $list.appendChild(empty)
    return
  }

  widgets.forEach((widget) => {
    const item = document.createElement('div')
    item.className = 'item'

    const main = document.createElement('div')
    main.className = 'item-main'

    const dot = document.createElement('span')
    dot.className = 'dot'
    const bulletColor = widget.color || '#FFF176'
    dot.style.backgroundColor = bulletColor
    dot.style.borderColor = getSlightlyDarkerColor(bulletColor)

    const title = document.createElement('div')
    title.className = 'item-title'
    title.textContent = widget.title || '(제목 없음)'
    title.title = '더블클릭해서 제목 수정'

    title.addEventListener('dblclick', () => {
      title.contentEditable = 'true'
      title.focus()
      const range = document.createRange()
      range.selectNodeContents(title)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    })

    title.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        title.blur()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        title.textContent = widget.title || '(제목 없음)'
        title.contentEditable = 'false'
      }
    })

    title.addEventListener('blur', async () => {
      if (title.contentEditable !== 'true') return
      title.contentEditable = 'false'
      const nextTitle = title.textContent.trim()
      await window.api.renameWidgetTitle(widget.id, nextTitle)
      await renderList()
    })

    main.appendChild(dot)
    main.appendChild(title)

    const actions = document.createElement('div')
    actions.className = 'item-actions'

    const btnFloat = document.createElement('button')
    btnFloat.className = 'btn-icon-float' + (widget.alwaysOnTop ? ' active' : '')
    btnFloat.setAttribute('data-tooltip', '항상 위에 띄우기')
    btnFloat.setAttribute('aria-label', '항상 위에 띄우기')
    btnFloat.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 2a8 8 0 0 1 8 8c0 3.2-2.5 5.6-4.5 7h-7C6.5 15.6 4 13.2 4 10a8 8 0 0 1 8-8z" class="balloon-body" />
        <path d="M12 2c2 2.5 2 11 0 15" />
        <path d="M12 2c-2 2.5-2 11 0 15" />
        <path d="M9 17l0.5 3" />
        <path d="M15 17l-0.5 3" />
        <rect x="9.5" y="20" width="5" height="3" rx="0.5" class="balloon-basket" />
      </svg>
    `
    btnFloat.addEventListener('click', async () => {
      const nextVal = !widget.alwaysOnTop
      await window.api.updateWidget({ id: widget.id, alwaysOnTop: nextVal })
      await renderList()
    })

    const btnDelete = document.createElement('button')
    btnDelete.className = 'btn-icon-delete'
    btnDelete.setAttribute('data-tooltip', '삭제')
    btnDelete.setAttribute('aria-label', '삭제')
    btnDelete.innerHTML = '<img src="Delete_icon.png" alt="" />'
    btnDelete.addEventListener('click', async () => {
      const ok = window.confirm('이 메모를 삭제할까요?')
      if (!ok) return
      await window.api.deleteWidgetById(widget.id)
      await renderList()
    })

    actions.appendChild(btnFloat)
    actions.appendChild(btnDelete)

    item.appendChild(main)
    item.appendChild(actions)
    $list.appendChild(item)
  })

  bindPanelTooltips($list)
}

window.api.onWidgetListUpdated(() => {
  renderList()
})

renderList()
