# 작업 히스토리

## 이력 관리 규칙

### 커밋 메시지 규칙

- 형식: `type: 변경 요약`
- 권장 type: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`
- 예시:
  - `feat: 메모 자동 정렬 옵션 추가`
  - `fix: 어두운 배경에서 텍스트 대비 개선`

### 태그(버전) 운영 규칙

- 배포 가능한 상태에서만 태그 생성
- 태그 형식: `vMAJOR.MINOR.PATCH` (예: `v1.0.3`)
- 권장 증가 기준:
  - `PATCH`: 버그 수정/사소한 개선
  - `MINOR`: 기능 추가(하위 호환)
  - `MAJOR`: 호환성 깨지는 변경

### 추천 릴리스 절차

1. 작업 브랜치/로컬에서 검증 (`npm run build`)
2. 커밋 후 `main` 반영
3. 태그 생성
   - `git tag -a v1.0.0 -m "release: v1.0.0"`
4. 원격 태그 푸시
   - `git push origin v1.0.0`

### 아이콘 정책 (현재 기준)

- 상세·재발 방지: **`docs/icon-policy.md`** (수정 전 필독).
- 설치본 Dock: `build/icon.icns` 번들 → `dock.setIcon` **호출하지 않음**.
- 개발: `npm start` → `dist` 앱 실행(`scripts/start-dev.js`). `electron .`·개발 `setIcon` 금지.
- 트레이: `status_icon.png` → 16×16 resize (`setupTray`). `todoList-icon.png` 미사용.
- `npm start`와 `/Applications` 설치본은 **별도 앱** — 개발 전 설치본 `Cmd+Q` 종료.

---

## 2026-07-17

### Windows 종료/재실행 시 메모·노트가 통째로 사라지는 문제 수정

- **증상**: Windows 11에서 앱을 종료했다가 다시 실행하면 가끔 메모와 초안 노트가 전부 사라지고, 기존 자료를 못 불러온 채 새로 시작한 것처럼 뜸.
- **원인**: `saveData()`가 `widgets.json`에 `writeFileSync`로 직접(비원자적으로) 덮어쓰는 구조였음. 강제 종료·정전·Windows 업데이트 재시작 등으로 쓰기 도중 프로세스가 죽으면 파일이 일부만 써진 채 깨짐. 다음 실행 때 `loadData()`의 `JSON.parse`가 이 깨진 파일에서 실패하면 `catch`에서 조용히 빈 배열을 반환했고, 앱은 이를 "기존 자료 없음"으로 오인해 기본 위젯을 새로 만든 뒤 시작 직후 `persistAll()`로 그 자리에서 바로 덮어써버려 원래 데이터가 영구히 유실됨.
- **수정** (`main.js` `loadData`/`saveData`):
  - 저장을 임시 파일(`widgets.json.tmp`)에 쓴 뒤 `rename`으로 교체하는 원자적 방식으로 변경 — 쓰기 도중 프로세스가 죽어도 기존 `widgets.json`은 그대로 보존됨.
  - 저장할 때마다 직전 상태를 `widgets.json.bak`으로 남겨, 메인 파일이 깨져도 로드 시 백업에서 자동 복구.
  - 백업조차 없거나 복구 실패 시, 손상된 파일을 조용히 지우지 않고 `widgets.json.corrupted-<시각>`으로 이름을 바꿔 보존(수동 복구 여지).
- `node -c main.js` 문법 검증 통과. 샌드박스에서는 빌드된 Electron 앱을 직접 구동해 재현 테스트를 할 수 없어(Gatekeeper 제약), **Windows 실기 확인 필요**: 빌드 후 강제 종료(작업 관리자 종료 등)로 재현 시도 → 재실행 시 데이터 유지되는지 확인.

### Windows에서 한글 블럭 수정 시 입력이 깨지는 문제 수정

- **증상**: Windows 11에서 이미 입력돼 있던 텍스트를 블럭으로 선택한 뒤 한글로 다시 입력(수정)하면 입력이 깨지고 이상한 현상이 발생. macOS에서는 아직 미발견.
- **원인**: `widget.js`의 위젯 제목(`$title`)·할일 항목 텍스트(`label`) 편집, `memo-list.js`의 메모 목록 제목 편집 — 이 세 곳의 `keydown` 핸들러가 `Enter`/`Escape`를 `e.isComposing` 체크 없이 바로 "편집 종료" 신호로 처리하고 있었음. 반면 같은 파일의 `$newTodo`(새 할일 입력창)는 `e.key === 'Enter' && !e.isComposing`으로 이미 정확히 가드돼 있었음(불일치). 한글은 자모 조합형 입력이라 마지막 글자를 조합 중(`isComposing: true`)일 때 `Enter`가 눌리면(조합 확정 목적이든 습관적으로 이어 누른 것이든), 조합이 끝나기도 전에 `blur()`로 편집 모드가 강제 종료되어 조합 중이던 문자가 잘리거나 깨진 채 커밋됨. Windows IME(TSF 기반)가 macOS 한글 입력기보다 조합 상태를 다르게/오래 유지하는 경향이 있어 Windows에서 더 두드러지는 것으로 추정.
- **수정** (`widget.js` `$title`/`label` keydown, `memo-list.js` `title` keydown): 세 곳 모두 `$newTodo`와 동일하게 `e.isComposing`일 때는 Enter/Escape 처리를 건너뛰도록 가드 추가.
- `npm run verify` 통과. 정적 코드 분석으로 찾은 확실한 불일치/버그이고 증상과도 부합하지만, 샌드박스 제약으로 실제 한글 IME 재현 테스트는 못함 — **Windows 실기 확인 필요**: 텍스트 블럭 선택 후 한글로 덮어쓰기, 특히 마지막 글자 조합 중 Enter를 눌러 재현 시도.

### 초안 노트 → 작업노트 명칭 변경 + 다중 생성/삭제 지원

- **요청**: ① "초안 노트" 명칭을 "작업노트"로 변경 ② 노트를 여러 개 추가할 수 있게 변경(기존엔 앱 전체에 1개만 존재하는 싱글톤이라 추가·삭제 둘 다 불가능했음).
- **변경 내용**:
  - 사용자 노출 텍스트 전부 "초안 노트" → "작업노트"로 변경(`main.js` 메뉴 4곳, `tray-menu.js`, `guide.html`, `widget.js`/`widget.html` 내부 주석).
  - `main.js`: 고정 id(`draft-note`)로 하나만 찾아 보여주던 `createDefaultDraftNoteData`/`openOrFocusDraftNote`를, 일반 메모(`addNewWidget`)와 동일한 패턴으로 `createDraftNoteData`(매번 `draft-${Date.now()}` 고유 id 생성)/`addNewDraftNote`(항상 새 위젯 생성)로 교체. 트레이·메뉴의 "작업노트" 클릭은 이제 "새 메모 추가"처럼 클릭할 때마다 새 작업노트를 하나씩 추가함. 최초 실행 시 최소 1개 보장하는 시작 로직은 유지.
  - `widget.js` `runMenuAction`: `type === 'draft'`일 때 막던 액션에서 `delete`를 제외(삭제만 허용, 위젯 내부에서 "새 메모 추가"로 이어지는 `add`는 계속 차단).
  - `widget.css`: `#more-delete`/`[data-action="delete"]`를 작업노트에서 숨기던 규칙 제거 — 삭제 버튼 노출.
  - `memo-list.js`: 메모 목록에서 `type === 'draft'`일 때 삭제 버튼을 아예 안 만들던 조건 제거 — 일반 메모와 동일하게 삭제 가능.
- 메모 목록(`메모 목록` 창)엔 개별 항목을 다시 "보이기"로 불러오는 기능 자체가 없음(전체 `모두 보이기`만 존재 — 기존 일반 메모와 동일한 제약이라 작업노트도 그 모델을 그대로 따름). 숨긴 작업노트를 다시 보려면 일반 메모와 마찬가지로 트레이의 "모두 보이기" 사용.
- `npm run verify` 통과. **Windows 실기 확인 필요**: 트레이 "작업노트" 클릭 시 새 노트가 추가되는지, 메모 목록에서 작업노트 삭제가 되는지.

### Windows 특수문자 입력(ㅁ+한자 키) 대응 — 글꼴 스택 보강

- **요청 배경**: Windows 11에서 노트·메모에 원(₩) 등 특수문자를 넣고 싶은데 잘 안 됨. 붙여넣기로 시도했던 최초 사례는 메모장 글꼴이 `\`를 ₩ 모양으로 그려주는 표시상의 착시로 판단(실제 코드 결함 아님). 이후 사용자가 실제로 쓰려는 방식은 한글 자음 하나(예: ㅁ) 입력 후 한자 키로 여는 Windows 자체 특수문자 후보 목록 — 이건 OS/IME가 제공하는 기능이라 앱이 직접 만드는 부분은 없음.
- **점검**: `widget.js`/`memo-list.js`/`main.js`/`preload.js`에 입력 문자를 걸러내거나 변형하는 코드는 없음(정규식 치환·sanitize 등 전무) — 앱이 특수문자 입력 자체를 막고 있지는 않음. 개요(`$memoDesc`)는 순수 `<textarea>`라 애초에 앱 코드 개입이 없고, 작업노트(`$draftText`)는 `contenteditable`이라 조합 관련 코드에 더 민감한데, 바로 위 항목에서 고친 "한글 조합 중 Enter 오작동" 버그가 같은 계열이라 그 수정으로 함께 개선됐을 가능성이 있음.
- **추가로 발견해 수정한 것**: `widget.css`/`memo-list.css`/`tray-menu.css`/`guide.html`/`tooltip.html`의 글꼴 스택이 전부 `-apple-system`, `'Helvetica Neue'`, `Pretendard` 등 macOS 전용/미번들 글꼴만 지정돼 있고 Windows용 글꼴이 하나도 없었음. Windows에서는 결국 브라우저가 임의로 대체 글꼴을 골라 쓰게 되어, 한자 키로 선택해 넣은 특수문자(㈜·℡·※ 등)가 네모 빈 칸(□)으로 깨져 보일 위험이 있었음 → 전 파일에 `'Malgun Gothic'`, `'Segoe UI'`를 명시적으로 추가.
- `npm run verify` 통과. 다만 ㅁ+한자 키 흐름 자체는 Windows IME/Chromium 조합 이벤트에 달려 있어 macOS 샌드박스에서 재현·검증이 불가능함 — **Windows 실기 확인 필요**: 노트/메모에서 한글 자음 입력 후 한자 키로 특수문자 후보가 뜨는지, 선택 시 정상 삽입·표시되는지.

### 메모 목록 개별 보이기/숨기기 + 작업노트 랜덤 색상 + 목록 스크롤 안 되는 버그 수정

- **요청 배경**: 작업노트를 여러 개 만들 수 있게 되면서(위 항목), 숨긴 걸 개별로 다시 불러올 방법이 없다는 게 드러남("모두 보이기"만 있었음). 또 새 작업노트가 항상 같은 색으로만 생성됨(일반 메모는 랜덤). 메모 목록 창도 항목이 많아지면 스크롤이 전혀 안 됨.
- **보이기/숨기기 토글**: `memo-list.js` 각 항목에 눈 아이콘 버튼 추가. 이미 존재했지만 아무 데서도 안 쓰이던 `toggle-widget-visibility` IPC(`main.js`)/`window.api.toggleWidgetVisibility`(`preload.js`)를 연결만 하면 됐음 — 메모든 작업노트든 항목 하나하나 다시 보이기/숨기기 가능해짐.
- **작업노트 랜덤 색상**: `createDraftNoteData()`의 `color: COLORS[1]` 고정값을, 일반 메모(`addNewWidget`)가 쓰는 `getRandomBrightColor()`로 교체.
- **메모 목록 스크롤 안 되는 버그** (가장 오래 걸린 문제): 처음엔 항목 수가 마침 창 높이(568px)에 거의 딱 맞아떨어져 스크롤 자체가 필요 없는 상태였던 것으로 오판(`contentClientHeight === contentScrollHeight`). 이후 사용자가 작업노트를 여러 개 더 만들어 17개까지 늘려서 재확인했는데도 `.content`의 `scrollHeight`가 여전히 `clientHeight`와 동일하게 568로 나옴 — 반면 `.list` 자체의 `getBoundingClientRect().height`는 730이었고 마지막 항목 좌표도 그만큼 아래에 실제로 렌더링돼 있었음. 즉 콘텐츠는 진짜로 넘치는데 스크롤 컨테이너(`.content`)가 그 오버플로를 인식하지 못하는 상태.
  - **원인**: `.content`가 `display:flex; flex-direction:column`인데 직계 자식이 `.section` 하나뿐이었음 — 자식이 하나뿐인 flex 컨테이너에서 `overflow-y:auto`의 `scrollHeight` 계산이 자식의 실제 오버플로 크기를 제대로 상위로 반영하지 못하는 Chromium flex-in-flex 케이스였던 것으로 파악.
  - **수정**: `.content`를 `display:flex`에서 `display:block`으로 변경(자식이 하나뿐이라 flex일 필요가 없었음). `flex:1; min-height:0`(부모 `.list-window`의 flex 아이템으로서의 크기 제약)와 `overflow-y:auto`는 유지.
  - 이 버그는 macOS에서 Cmd+Option+I 개발자 도구를 임시로 띄워(`main.js`에 `openDevTools` 한 줄, `memo-list.js`에 `console.log` 진단 코드 추가) `clientHeight`/`scrollHeight`/`getBoundingClientRect()`를 실측하며 찾아냈고, 수정 후 진단 코드는 모두 제거함.
- **Mac 실기 확인 완료**: 스크롤 정상 동작, 보이기/숨기기 토글 정상 동작, 작업노트 랜덤 색상 정상 동작 — 사용자가 직접 로컬 빌드로 확인함. `npm run verify` 통과.

### 다른 앱 창 위에서 메모/노트 리사이즈가 안 되는 문제 수정

- **증상**: 메모·노트 가장자리에 커서를 대서 리사이즈 커서로 바뀐 걸 확인하고 눌러도, 드래그가 안 먹히고 클릭이 위젯이 아니라 뒤/근처에 있는 다른 앱 창으로 새어나가 그 앱이 대신 포커스됨. Mac·Windows 둘 다 보고됨. 위젯을 빈 바탕화면 위로 옮겨서 시도하면 정상 동작 — 다른 앱 창과 겹쳐 있을 때만 재현됨.
- **원인**: `createWidget()`(`main.js`)의 `BrowserWindow` 옵션에 `resizable: true`가 켜져 있었음. 이 앱은 리사이즈를 `.resize-handle`(가장자리 5~10px 얇은 div) + Pointer Capture + `setWindowBounds` IPC로 완전히 자체 구현하고 있는데, `resizable: true`가 같이 켜져 있으면 macOS/Windows가 창 가장자리에 보이지 않는 OS 자체 리사이즈 감지 영역을 추가로 예약해 우리 핸들과 같은 자리에서 경쟁하게 됨. 빈 바탕화면 위에서는 이 경쟁이 잘 안 드러나다가, 인접한 다른 앱 창이 있으면 OS 창 관리자가 그 경계에서 클릭을 엉뚱한 창으로 넘겨버리는 것으로 파악.
- **진단 과정**: 처음엔 Pointer Capture가 드래그 도중 풀리는 것으로 추정해 `pointerdown`/`pointermove`/`pointerup`/`pointercancel`/`lostpointercapture`에 진단 로그를 넣고(`widget.js`), 위젯 창에 Cmd+Option+I로 개발자 도구를 여는 임시 단축키를 추가(`main.js`)했음. 하지만 사용자가 재현하는 과정에서 "클릭 자체가 다른 앱으로 넘어간다"는 더 정확한 증상을 확인해, 포인터 캡처가 아니라 OS 리사이즈 영역 충돌 쪽으로 원인을 좁힘.
- **수정** (`main.js` `createWidget`): `resizable: true` → `resizable: false`. 진단 코드(콘솔 로그, DevTools 단축키)는 모두 제거.
- **Mac 실기 확인 완료**: 다른 앱 창과 겹친 상태에서도 리사이즈 정상 동작 확인. `npm run verify` 통과. **Windows 실기 확인 필요**(Windows에서도 같은 증상이 보고됐던 문제라 같은 원인일 가능성이 높지만, `resizable` 옵션의 OS별 리사이즈 힌트 처리 방식이 다를 수 있어 별도 확인 필요).

---

## 2026-07-04

### Windows 로그인 시 자동 실행 안 되는 문제 수정

- **증상**: Windows에서 "시작 시 실행"을 켜고 재부팅해도 앱이 자동 실행되지 않음(체크박스 상태는 켜진 채로 남아있어 더 헷갈림).
- **원인**: Windows 빌드 타깃이 `portable`(`package.json` `build.win.target`)이라, 실행할 때마다 앱이 임시 폴더에 풀려 그 안의 exe를 구동함 — 이 상태의 `process.execPath`는 매번 바뀌는 임시 경로. 그런데 `main.js`의 로그인 항목 등록 코드 3곳(`handleTrayMenuAction('login')`, 트레이 컨텍스트 메뉴 체크박스, 최초 실행 시 자동 등록)이 전부 `app.setLoginItemSettings({ openAtLogin: true })`처럼 `path`를 지정하지 않아 기본값(`process.execPath`, 즉 임시 경로)이 레지스트리에 등록됨. 그 임시 폴더는 앱 종료 후 사라지므로 재부팅 시 Windows가 존재하지 않는 경로를 실행하려다 조용히 실패.
- **수정**: `getLoginItemOptions()`/`getOpenAtLogin()`/`setOpenAtLogin()` 헬퍼 추가(`main.js`). Windows에서 electron-builder portable 런처가 심어주는 `PORTABLE_EXECUTABLE_FILE` 환경변수(사용자가 실제로 받은 고정 exe 경로)가 있으면 그 경로로 등록·조회하도록 통일. mac은 옵션이 빈 객체(`{}`)라 기존 동작과 동일 — 동작 변화 없음.
- `npm run verify` 통과, `npm run build`로 `/Applications` 갱신 완료(mac 쪽 로직 변화 없어 재검증 생략). **Windows 실기 확인은 다음 집 PC 테스트 때 필요**: 로그인 시 실행 체크 → 재부팅 → 자동 실행 확인.

---

## 2026-07-03

### Windows(집 PC) 첫 실기 테스트 — 트레이 메뉴·초안 노트

- **테스트 대상**: Actions `build-windows.yml` 최신 실행(#9, 커밋 `8bf1888`) 아티팩트 exe. GitHub Actions 실행 목록 확인 결과 `#5`(최초 초안 노트 싱글톤 커밋 `51efdab`) 1건만 실패, 이후 전부 성공(초록 체크) — 최신 빌드엔 초안 노트 3개 커밋(`51efdab`/`8a35cc5`/`ad20fa1`) 모두 반영.
- **초기 증상 3가지 보고**: ① 트레이 아이콘 클릭해도 커스텀 메뉴가 안 뜸 ② 실행하자마자 "초안 노트"·"오늘의 할일" 메모가 바로 뜸(첫 실행이면 초안 노트는 `hidden:true`라 안 떠야 정상) ③ 새 메모 추가 반응 없음.
- **원인**: 싱글 인스턴스 잠금(`app.requestSingleInstanceLock`) 때문에, 앞서 "관리자 실행해도 반응 없음"이라 여겼던 첫 실행이 실제로는 백그라운드에서 계속 떠 있었던 것으로 추정. 두 번째 실행은 새 프로세스가 아니라 `second-instance` 핸들러가 기존 위젯을 그냥 다시 보여준 것이었고, 트레이 아이콘도 Windows 알림영역 숨김 아이콘(`^`) 안에 있어 못 찾고 있었음.
- **조치**: 작업 관리자에서 중복 프로세스 종료 → 트레이 아이콘 재확인 → **정상 동작 확인**. 트레이 우클릭 메뉴(z-order 포함, `3f4b52d`)와 초안 노트 메뉴 항목 모두 집 PC 실기에서 첫 확인 완료. 코드 수정 없이 해결.
- **잠재 취약점(코드 미수정, 참고용)**: `main.js` `popupTrayMenu()`는 렌더러(`tray-menu.js`)가 자기 높이를 계산해 `tray-menu-resize` IPC로 알려줘야만 `show()`가 호출되는 구조라, 그 왕복이 실패하면 창이 생성되고도 영구히 안 보이는 상태가 될 수 있음. 이번엔 원인이 아니었던 것으로 결론났지만, 재발 시 `placeTrayMenuWindow()`를 `did-finish-load` 후 타임아웃 폴백으로 강제 호출하는 방향 고려.
- **미확인 항목(남음)**: 초안 노트 붙여넣기 후 `Ctrl+Z`/`Ctrl+Shift+Z`, 서식 단축키(`Ctrl+B`/`Ctrl+Shift+X`/`Ctrl+Shift+H`), `npm start`(Windows) 신규 경로, `guide.html` 플랫폼 전환 — `current_task.md` 참고.

---

## 2026-07-02

### 초안 노트(draft-note) 붙여넣기 후 실행취소/다시실행 안 되는 문제 수정

- **증상**: 초안 노트에서 텍스트 입력·복사/붙여넣기·잘라내기/붙여넣기는 정상 동작하지만, 이후 `Cmd+Z`(실행취소)/`Cmd+Shift+Z`(다시실행)가 동작하지 않음.
- **원인**: `widget.js`의 `handleClipboardShortcut()`에서 `textarea`/`input`(초안 노트 `#draft-text`, 할 일 입력창 `#new-todo`)에 붙여넣기 시 `target.value = ...`로 문자열을 직접 대입 → 브라우저 네이티브 undo 스택이 초기화되어 이후 실행취소/다시실행이 무효화됨. 제목(`contentEditable`)은 이미 `document.execCommand('insertText', ...)`를 써서 문제 없었음.
- **수정**: 모든 붙여넣기 대상에서 `document.execCommand('insertText', false, text)`로 통일(`widget.js`). textarea/input에서도 undo 스택을 보존하는 네이티브 명령이라 별도 분기 불필요.
- `npm run verify` 문법 검사 통과. `npm run build`로 `dist/`·`/Applications/todoList-myfunfun.app` 모두 갱신 후 실행 앱에서 붙여넣기 → 실행취소/다시실행 정상 동작 확인 완료(mac).
- **Windows 미검증**: 공용 코드(`widget.js`)라 Windows에도 그대로 적용되지만, 다음 Windows(집 PC) 테스트 때 초안 노트 붙여넣기/실행취소·다시실행 동작을 같이 확인할 것.

### 초안 노트(draft-note) 볼드·취소선·하이라이트 서식 추가

- **요청**: 초안 노트에서 텍스트 블록 선택 후 볼드/취소선/하이라이트(형광펜) 서식을 적용하고 싶다는 요청.
- **단축키**: `Cmd/Ctrl+B` 볼드, `Cmd/Ctrl+Shift+X` 취소선, `Cmd/Ctrl+Shift+H` 하이라이트(`#fff59d`). 앱 내 기존 단축키(`Cmd+N`, `Alt+F4`)와 충돌 없음을 확인 후 결정. `Cmd+U`(밑줄 관례)·`Cmd+T`(탭 확장 여지)·평범한 `Shift+H`(대문자 타이핑과 충돌)는 후보에서 제외.
- **구조 변경**: `#draft-text`를 부분 서식이 불가능한 `<textarea>`에서 `contenteditable` div로 전환(`widget.html`). 볼드/취소선/하이라이트 모두 `document.execCommand` 기반이라 기존 undo/redo 스택과 자연스럽게 통합됨.
- **데이터 마이그레이션**: 기존 초안은 순수 텍스트, 서식 적용 후에는 HTML 저장 — 로드 시 `<` 포함 여부로 구분해 순수 텍스트는 이스케이프(`widget.js` `onInitWidget`).
- **플레이스홀더**: contenteditable엔 네이티브 `placeholder`가 없어 `:empty::before` + `data-placeholder`로 대체. Chromium이 완전히 비워도 `<br>` 하나를 남기는 경우가 있어 blur/input 시 `innerHTML`을 강제로 비우는 정규화 로직 추가.
- **버그 수정(1차 확인 중 발견)**: 하이라이트 토글이 항상 "끄기"로만 동작 — 초안 노트 배경 자체가 `rgba(0,0,0,0.06)`라 `document.queryCommandValue('backColor')`가 이 배경색을 "이미 하이라이트됨"으로 오판. 직접 적용한 하이라이트 색(`rgb(255, 245, 157)`)과 정확히 일치하는지만 비교하도록 수정.
- **low-light 대응**: 어두운 배경 모드에서도 하이라이트 위 글자는 항상 어두운 색으로 고정해 대비 확보(`widget.css`).
- `npm run verify` 통과. `npm start`로 볼드/취소선/하이라이트 토글·undo/redo 사용자 확인 완료(mac). `npm run build`로 `/Applications` 갱신 완료.
- **Windows 미검증**: 공용 코드라 그대로 적용되지만, 다음 Windows(집 PC) 테스트 때 서식 단축키(`Ctrl+B`/`Ctrl+Shift+X`/`Ctrl+Shift+H`) 동작을 같이 확인할 것.

### Windows 포팅 Phase 2 마무리 · Phase 3 일부 진행 (guide.html)

- **배경**: mac/Windows를 같은 레포에서 함께 포팅하기로 했으나 어느 시점부터 mac 작업만 이어지고 Windows Phase 2 잔여 항목이 방치됨. `docs/windows-port.md` 체크리스트 기준으로 밀린 코드 작업을 이어서 진행(테스트는 사용자가 집 PC에서 직접 수행).
- **`scripts/start-dev.js` — Windows 개발 실행 경로 추가**: 기존에는 macOS 외 플랫폼이면 즉시 에러 종료. `process.platform`으로 분기해 Windows에서는 `dist/win-unpacked/todoList-myfunfun.exe`를 실행하고, 소스 변경 감지 시 `npm run build:win:dir`(electron-builder `--win dir`)로 재빌드하도록 확장. 리빌드 감지 대상 `SOURCE_FILES`에 누락돼 있던 `tray-menu.*`(Windows 전용 커스텀 트레이 메뉴 창)도 함께 추가.
- **`widget.js` 단축키 `Ctrl` 감사**: `handleClipboardShortcut`(복사/잘라내기/붙여넣기)·`handleFormatShortcut`(볼드/취소선/하이라이트) 모두 이미 `e.metaKey || e.ctrlKey`로 mac/Windows를 공통 처리하고 있어 추가 코드 변경 없이 감사만 완료. 실기 확인은 집 PC 테스트로 남김.
- **`guide.html` — Windows 안내 추가**: 지금까지 `macOS 전용`으로 고정돼 있던 사용 가이드를 플랫폼별로 전환. `window.api.getPlatform()`(widget.js와 동일 패턴)으로 `body.platform-win32` 클래스를 붙이고, `.mac-only`/`.win-only` span으로 새 메모 단축키(⌘N ↔ Ctrl+N)·메뉴바 ↔ 작업 표시줄 트레이 문구·색상 피커 명칭·로그인 시 자동 실행/종료 항목을 분기. 이 김에 그동안 가이드에 전혀 없었던 **초안 노트** 항목도 추가(여는 방법 + 서식 단축키).
- `npm run verify` 통과, `guide.html` div/span 태그 밸런스 확인. **mac 쪽 GUI 실행 재검증은 이번에 못 함** — 이 세션의 Bash 실행 환경 자체가 `com.apple.provenance`/Gatekeeper 정책으로 로컬 빌드 앱 실행을 막고 있어(이전 볼드/취소선/하이라이트 작업 때 발견한 것과 동일한 제약) 정적 검사로 대체.
- **Windows 미검증(전부 집 PC 실기 테스트 필요)**: `npm start`(Windows 신규 경로), `Ctrl` 단축키 실동작, `guide.html` 플랫폼 전환 표시. `current_task.md`·`docs/windows-port.md`에 체크리스트 반영.
- **후속(같은 날)**: 사용자 피드백으로 초안 노트 서식 단축키 표기를 "블록 선택 후 ⌘B/⌘⇧X/⌘⇧H로 볼드·취소선·하이라이트 적용" 한 줄 문장에서 **이름(볼드/취소선/하이라이트) + 단축키를 행별로 분리**한 목록(`.format-list`)으로 변경 — 가독성 개선. `npm run build`로 `/Applications` 갱신 확인 후 커밋·푸시(`8bf1888`). 이 push로 `.github/workflows/build-windows.yml`(`**.html` 경로 트리거) 자동 빌드가 걸려, 집 PC 테스트용 최신 exe는 GitHub Actions Artifacts에서 받으면 됨.

---

## 2026-06-28

### 초안 노트(draft-note) 싱글톤 위젯 추가

- **개요**: 할일 리스트 대신 textarea 하나로 꽉 찬 자유 텍스트 메모. 앱 전체에 단 하나만 존재(추가/삭제 없음) — 내용은 그 안에서 직접 쓰고 지움.
- **구현**: 새 파일 없이 기존 `widget.html`/`widget.js`/`widget.css`를 `data.type === 'draft'` 분기로 확장(메모와 동일한 드래그·접기/펼치기·리사이즈·색상 변경·항상 위에 띄우기·툴팁 재사용).
  - `main.js`: `createDefaultDraftNoteData()`(고정 `id: 'draft-note'`)로 시드 — 신규 설치·기존 `widgets.json` 업그레이드 모두 보장. `openOrFocusDraftNote()` 추가, 트레이 메뉴(mac 네이티브 + Windows 커스텀 팝업)·앱메뉴 "메모" 서브메뉴에 **초안 노트** 항목 추가. `getWidgetListPayload()`에 `type` 필드 추가.
  - `widget.html`/`widget.css`: `#draft-text` textarea 추가, `body.is-draft-note` 클래스로 본문(할일 리스트)·＋(메모 추가)·삭제 컨트롤 숨김.
  - `widget.js`: `data.type === 'draft'` 분기로 `text` 필드 동기화(`memo-desc`와 동일하게 blur 시 저장), `#new-todo`와 동일한 클립보드 보조(`handleClipboardShortcut`) 재사용.
  - `memo-list.js`: 초안 노트 행은 색상 점·제목 수정·항상위 토글은 동일하게 노출, 삭제 버튼만 숨김(삭제 불가 항목이므로).
  - `tray-menu.js`(Windows): 동일 메뉴 항목 추가 — **실제 Windows 동작 확인은 다음 Windows 테스트 때 같이 진행**(이번엔 mac만 로컬 검증).
- mac `npm start`로 로컬 검증 완료(트레이 메뉴 진입·텍스트 입력/유지·메모 목록 노출 확인).
- **`npm run build`로 `/Applications/todoList-myfunfun.app`(실제 Dock 실행 설치본)까지 갱신·확인 완료.** `npm start`는 `dist/` 개발용 복제본만 빌드해 둘이 별개라, 설치본에는 반영 안 됐던 걸 뒤늦게 발견해 추가로 빌드함 — 기능 완료 시 `npm run build`까지 같이 하는 걸 빠뜨리지 말 것.

---

## 2026-05-26

### Windows 포팅 · 집 PC 테스트 (세션 마무리)

**맥(개발)** — `npm start`로 mac 개발 유지. Windows exe는 **GitHub Actions `Build Windows`** 로만 빌드(Mac 로컬 `build:win`은 느리고 권한 이슈 있어 사용 안 함).

**Phase 1 — 빌드** (`212d3e3`)

- `docs/windows-port.md`, `build:win`, `generate-win-icon.js`, Actions 워크플로.
- Actions #1 성공(약 3분 28초), Artifacts `todoList-myfunfun-win-x64` → portable exe 확인.
- 집 Windows PC: GitHub 로그인 후 Actions에서 exe 재다운로드( Mac→USB 옮길 필요 없음).

**Phase 2 — 1차 집 PC 테스트 피드백** (`5866cc6`)

| 항목 | 결과 |
|------|------|
| 항상 위 | 설정해도 다른 앱 위로 안 올라옴 → `applyAlwaysOnTop` + win `screen-saver` |
| 작업표시줄·트레이 | 아이콘·메뉴 없음 → win 트레이 32px, `skipTaskbar: false`, 파일 메뉴·종료 |
| 종료·가이드·목록 | 없음 → 트레이·**파일** 메뉴(Alt+F4 종료) |
| 작업 관리자 | Electron 이름 → `AppUserModelId`, `signAndEditExecutable: true` |
| 타이틀바 ＋ | 너무 큼 → `platform-win32` CSS 축소 |
| 작업표시줄 아이콘 | **정상** |

**Phase 2 — 2차 집 PC 테스트 피드백** (`aff15d2`)

| 항목 | 결과 |
|------|------|
| 트레이 메뉴 | OS 기본 메뉴 너무 넓·여백 불일치 → `tray-menu.*` 커스텀 다크 메뉴 |
| 툴팁 | 깜빡임·삭제 후 잔류 → hover 전환 시 즉시 hide, 삭제/목록 갱신 시 정리 |
| 목록 여백 | 너무 넓음 → `memo-list.css`·`platform-win32` 축소, 푸터 `macOS 전용` 문구 제거 |

**Phase 2 — 3차 (미재테스트)** (`3f4b52d`)

- 트레이 메뉴가 **메모 창 아래** 깔림 → `transparent: false`, `type: popup`, `screen-saver` + `moveTop()`.
- **다음에 할 일:** Actions `3f4b52d` 빌드 후 exe로 트레이 메뉴가 메모 **위**에 뜨는지 재확인.

**관련 커밋 (최신순)**

- `3f4b52d` fix: 트레이 메뉴 z-order
- `aff15d2` fix: 트레이 커스텀 메뉴·툴팁·목록 여백
- `5866cc6` fix: 트레이·작업표시줄·항상 위·메뉴·타이틀바
- `212d3e3` feat: Windows portable 빌드·Actions (Phase 1)

**버전·릴리스 (합의)**

- mac **1.1.0** 유지( dmg 배포 완료).
- Windows 첫 공개는 **1.2.0**에 dmg + exe 묶음 예정 (`docs/windows-port.md`).

**v1.1.0 배포 준비** — 공개 릴리스 문구: `docs/release-notes-v1.1.0.md`, `public-release-work/releases/v1.1.0.md`

### 메모 열 정렬 (`main.js`)

- 접기/펼치기 후 아래 메모 간격이 복구되지 않던 문제 수정:
  - `getWidgetLayoutHeight` — `collapsed`/`expandedHeight` 기준 높이 계산(접은 직후 `getBounds` 지연 대응).
  - `scheduleColumnReflow` — `resized` + 50ms 폴백 후 `reflowColumn`.
  - 앱 시작 시 `reflowAllColumnsOnStartup` — 저장된 y 간격 복구.
  - 같은 열 메모 간격 `COLUMN_GAP = 1`px.
- 재정렬 보강:
  - 열 판정: x 구간 겹침 → **창 중심 X** (`COLUMN_X_CENTER_THRESHOLD = 80`) — 좌·우 두 열이 한꺼번에 묶이며 간격이 깨지던 문제.
  - **숨긴 메모** reflow 제외(펼친 채 ✕ 숨김 시 유령 간격 방지).
  - 메모 **닫기(숨기기)** 후 같은 열 재정렬.

### UI (`widget.css`)

- **더보기(⋯) 메뉴** — 우클릭·툴팁과 동일 스타일로 통일, 로컬 검증 완료:
  - 밝은 흰 패널 → 다크 톤(`rgba(0,0,0,0.82)`, 흰 글자·삭제 `#ff8f8f`·활성 체크 흰색).
  - 더보기·우클릭 **동일 메뉴**로 `width: max-content`, 패널 `font-size: 11px`·항목 `font: inherit` (`min-width: 168px`·항목별 flex 차이 제거).
  - 호버 배경이 메뉴 전체 너비에 맞도록 정리.

### 메모 편집 UX (`widget.js`, `widget.css`, `main.js`)

- **개요**(`memo-desc`): 접힌 상태에서 높이 오측정 → `scheduleResizeDesc`로 펼칠 때만 재측정(최대 140px, 초과 시 스크롤). 로컬 검증 완료.
- **제목**: 편집 시 `user-select: text`, `mousedown` 전파 차단, `⌘A` 전체 선택.
- **제목·할 일 추가 입력창** 복사/붙여넣기:
  - macOS 메뉴 **편집** 역할(잘라내기·복사·붙여넣기·전체 선택).
  - `handleClipboardShortcut` — 제목·`#new-todo`에서 `⌘C`/`⌘V`/`⌘X` 보조.
  - `.new-todo`: `user-select: text`, `-webkit-app-region: no-drag`.
  - 백업: `backups/20260526-clipboard/`. 로컬 검증 완료.

### v1.1.0 기능·문서·개발 환경

- 타이틀바 UI 정리:
  - **좁은 창**(기본): 타이틀바에 `⋯` 더보기·`✕` 닫기만 표시. 메모 추가·색상·항상 위에 띄우기는 더보기 메뉴 또는 **⌘N** / 트레이 메뉴.
  - **넓은 창**(`titlebar-expanded`): 열기구·`＋`·색상환을 타이틀바에 펼침, `⋯` 숨김.
  - `guide.html` 사용 가이드 반영.
- **v1.1.0** 패치 (코드 필드: `alwaysOnTop`):
  - **항상 위에 띄우기** 기능 추가:
    - 원하는 메모를 다른 창·앱 위에 표시. 아이콘은 열기구(`btn-float`).
    - 메모 타이틀바(넓은 창) 또는 더보기 메뉴에서 on/off.
    - 활성 시 호버·선택 스타일(`translateY`), 저명도(`low-light`)에서 흰색 계열 반전.
    - `BrowserWindow.setAlwaysOnTop(true, 'floating')` — 띄워 둔 상태에서도 드래그·리사이즈 가능.
    - `widgets.json`에 저장, 재시작 후 복원.
  - 메모 목록 연동:
    - `btn-icon-float` 열기구로 동일 기능 on/off, 띄워 둔 중 파란색 active.
    - IPC `external-always-on-top-update`로 메모·목록 UI 동기화.
  - 사용 가이드(`guide.html`)·표기 통일:
    - 기능·툴팁 명칭 **항상 위에 띄우기** (「맨 위 고정」은 핀 고정 오해 방지).
    - 메모 관리: `✕` 닫기(숨기기), 삭제는 메모 목록 휴지통, **모두 숨기기/보이기**.
    - 가이드에 열기구 SVG 인라인, **메모 목록에서 항상 위에 띄우기** 항목.
  - 툴팁:
    - 메모 타이틀바: `data-tooltip` + 별도 panel 창(`tooltip.html`, `widget.js` → `main.js`). CSS `::before`는 비활성(색상환 `::after` 도넛과 분리).
    - 메모 목록: panel 툴팁(`memo-list.js`, 메모와 동일 `preferBelow: false` — 아이콘 위). 메모 `✕` 닫기 툴팁 제거.
    - 메모 타이틀바 문구: `메모지 색상 변경` · `메모추가` · `항상 위에 띄우기` · `더보기` · `닫기`.
  - 릴리스: `docs/release-notes-v1.1.0.md`, `package.json` `1.1.0`.
- 개발 문서 정리: `current_task.md`·`history.md`·`docs/*` 오타·타이틀바·툴팁·배포 절차를 코드 기준으로 통일.
- `npm start`: `electron .` 대신 `scripts/start-dev.js` → `dist/...app` 실행(Dock 체크 아이콘 정상). `build:dir` 분리.
- `docs/icon-policy.md` 추가(Dock·dist vs `/Applications`·재발 방지).
- 사용 가이드(`guide.html`):
  - **더보기 메뉴** 설명 간략화(픽셀·툴팁 세부 제거).
  - **창 조작**에 **빈 화면 우클릭** 항목 추가(펼친 메모 본문 빈 곳 → `⋮`와 동일 메뉴).

## 2026-05-21

- 공개 배포 문서 정리: README·릴리스 노트·GitHub Release 본문을 동일한 ⚠️ 3줄 불릿 형식으로 통일.
- `public-release-work/WORKFLOW.md` 추가, `docs/setup.md`·`current_task.md`의 폴더명을 `public-release-work`로 통일.
- `.gitmodules` 등록으로 공개 레포 서브모듈 경로를 명시 (VS Code Git 혼동 완화).

## 2026-04-15

- 초기 macOS todoList 위젯 앱 베이스를 구성.
- `README.md`를 추가하고 설치/실행 방법 및 Apple Silicon/Intel 빌드 주의사항을 정리.
- 긴 제목 편집 후 말줄임 위치가 어긋나는 UI 문제를 수정.

## 2026-04-29

- 메모 색상 가독성 기준을 강화해 텍스트 대비를 개선.
- 이력 관리 규칙과 `.gitignore`를 정리.

## 2026-05-06

- 트레이 메뉴에서 메모 직접 나열을 제거하고 `메모 목록 열기` 기반으로 단순화.
- 별도 `메모 목록` 팝업을 추가(열기/닫기, 삭제, 제목 더블클릭 편집 지원).
- 메모 목록 팝업 스타일 톤을 `사용 가이드` 팝업과 통일.
- 실행/배포 흐름을 앱 이름(`todoList-myfunfun`) 기준으로 정리.
- Dock 아이콘 동작을 정리(실행 중 원복 관련 이슈 수정).

## 2026-05-07

- 메모 관리 UX 역할 정리(이후 항상 위에 띄우기·가이드 문서에서 상세 기술):
  - 메모창 우측 `✕`: 삭제 → **닫기(숨기기)**. 실제 삭제는 **메모 목록**으로 이동.
  - 여러 메모 표시/숨김: 트레이 **모두 숨기기** / **모두 보이기** (`allWidgetsHiddenMode`).
- 레포지토리 운영 구조를 이원화:
  - 공개 사용자용: `macOS-todoList-myfunfun`
  - 개발/유지보수용: `macOS-todoList`
- 공개 레포 네이밍 규칙을 정리(`-myfunfun` 접미사는 일반 사용자 공개용으로 사용).
- 공개 레포의 설치 안내 문서/릴리스 템플릿/배포 체크리스트를 구성해 배포 채널을 분리.
- `README.md`에서 작업 히스토리/릴리스 운영 내용을 제거해 설치 가이드 중심 문서로 정리.
- 커밋/태그/릴리스 절차 등 개발 이력 관리 규칙을 `history.md`로 분리해 문서 역할을 명확화.
- 메모 목록 UI 개편(내부 라벨 제거, 삭제 버튼 아이콘화, 말머리 스타일 조정).
- 트레이 메뉴 문구를 `메모 목록 열기`에서 `메모 목록`으로 정리.
- 메모 목록의 삭제 버튼 UI를 조정해 기본 명도는 살짝 밝게, hover 시 어둡게 되도록 수정.
- 삭제 버튼 hover 효과를 메모 목록 팝업의 닫기 버튼과 동일한 톤으로 통일.
- 트레이 아이콘 로딩 경로를 정리해 `status_icon.png`를 패키지 앱에서 직접 사용하도록 수정.
- 트레이 아이콘 소스는 @2x(32x32) 기준으로 맞추고, 표시 로직은 논리 16x16 기준으로 렌더링하도록 보정.
- 빌드 포함 파일 목록에 `Delete_icon.png`, `status_icon.png`를 추가해 배포 누락 방지.
- `모두 숨기기` 첫 실행 시 일부 메모가 남는 문제를 수정:
  - 전역 상태(`allWidgetsHiddenMode`)를 추가하고
  - 창 로드 완료 타이밍(`did-finish-load`)에서도 숨김 상태를 강제 적용하도록 보강.
- macOS 배포용 `dmg` 1차 릴리스를 준비/검증:
  - `package.json`에 `build:dmg`, `build:release` 스크립트를 추가해 설치 파일 생성 경로를 표준화.
  - `dist/todoList-myfunfun-1.0.0-arm64.dmg` 생성 확인 후 GitHub Releases 업로드 기준 파일을 확정.
  - 배포 산출물 업로드 기준을 정리(`.dmg`만 업로드, `.blockmap`/`builder-*.yml`은 제외).

