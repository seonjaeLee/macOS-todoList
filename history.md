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

## 2026-05-26

### Windows 포팅 Phase 1 (빌드 인프라)

- `docs/windows-port.md` — 단일 레포·Phase 0~4 계획.
- `package.json` — `build:win` / `build:win:dir` / `icons:win`, portable x64, `png-to-ico`.
- `scripts/generate-win-icon.js`, `.github/workflows/build-windows.yml` (Actions → exe 아티팩트).
- CI용 `build/icon.png`만 git 추적 (`.gitignore` 예외).

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

