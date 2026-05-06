const $list = document.getElementById('list')
const $btnClose = document.getElementById('btn-close')

$btnClose.addEventListener('click', () => window.close())

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
    dot.style.backgroundColor = widget.visible ? (widget.color || '#FFF176') : 'transparent'

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

    const btnToggle = document.createElement('button')
    btnToggle.className = 'btn'
    btnToggle.textContent = widget.visible ? '닫기' : '열기'
    btnToggle.addEventListener('click', async () => {
      await window.api.toggleWidgetVisibility(widget.id)
      await renderList()
    })

    const btnDelete = document.createElement('button')
    btnDelete.className = 'btn btn-delete'
    btnDelete.textContent = '삭제'
    btnDelete.addEventListener('click', async () => {
      const ok = window.confirm('이 메모를 삭제할까요?')
      if (!ok) return
      await window.api.deleteWidgetById(widget.id)
      await renderList()
    })

    actions.appendChild(btnToggle)
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
