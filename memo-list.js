const $list = document.getElementById('list')
const $btnClose = document.getElementById('btn-close')

$btnClose.addEventListener('click', () => window.close())

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

    const btnDelete = document.createElement('button')
    btnDelete.className = 'btn-icon-delete'
    btnDelete.innerHTML = '&times;'
    btnDelete.title = '삭제'
    btnDelete.setAttribute('aria-label', '삭제')
    btnDelete.addEventListener('click', async () => {
      const ok = window.confirm('이 메모를 삭제할까요?')
      if (!ok) return
      await window.api.deleteWidgetById(widget.id)
      await renderList()
    })

    actions.appendChild(btnDelete)

    item.appendChild(main)
    item.appendChild(actions)
    $list.appendChild(item)
  })
}

window.api.onWidgetListUpdated(() => {
  renderList()
})

renderList()
