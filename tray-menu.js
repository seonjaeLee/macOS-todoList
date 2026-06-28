const $menu = document.getElementById('menu')

function addSep() {
  const sep = document.createElement('div')
  sep.className = 'menu-sep'
  sep.setAttribute('role', 'separator')
  $menu.appendChild(sep)
}

function addButton(label, action, hint) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'menu-item' + (hint ? ' menu-item--row' : '')
  btn.dataset.action = action
  if (hint) {
    btn.innerHTML = `<span>${label}</span><span class="menu-hint">${hint}</span>`
  } else {
    btn.textContent = label
  }
  btn.addEventListener('click', () => {
    window.trayMenuApi.runAction(action)
  })
  $menu.appendChild(btn)
}

function addCheckbox(label, action, checked) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'menu-item menu-item--check' + (checked ? ' is-on' : '')
  btn.dataset.action = action
  btn.innerHTML = `<span>${label}</span><span class="menu-check">✓</span>`
  btn.addEventListener('click', () => {
    window.trayMenuApi.runAction(action)
  })
  $menu.appendChild(btn)
}

async function render() {
  const state = await window.trayMenuApi.getState()
  $menu.innerHTML = ''

  addButton('새 메모 추가', 'add', 'Ctrl+N')
  addSep()
  addButton('메모 목록', 'list')
  addSep()
  addButton('초안 노트', 'draft-note')
  addSep()
  addButton(state.allVisible ? '모두 숨기기' : '모두 보이기', 'toggle-all')
  addSep()
  addCheckbox('시작 시 실행', 'login', state.openAtLogin)
  addSep()
  addButton('사용 가이드', 'guide')
  addSep()
  addButton('종료', 'quit')

  const h = Math.ceil($menu.getBoundingClientRect().height) + 2
  window.trayMenuApi.resize(h)
}

window.trayMenuApi.onRefresh(() => {
  render()
})

render()
