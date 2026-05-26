# Windows 포팅 계획 · 개발 소스 관리

macOS v1.1.0 배포 이후, **같은 코드베이스**에서 Windows를 지원하기 위한 계획입니다.  
폴더를 복제하지 않고, **이 레포(`macOS-todoList`) 하나**에서 mac / Windows를 함께 유지합니다.

관련: `docs/release.md` · `public-release-work/WORKFLOW.md` · `history.md`

---

## 1. 원칙

| 원칙 | 설명 |
|------|------|
| **단일 소스** | `widget.*`, `memo-list.*`, `preload.js`, 데이터 형식(`widgets.json`)은 OS 공통 |
| **플랫폼 분기** | mac / Windows 차이는 `main.js`(및 필요 시 `scripts/`)에서 `process.platform` 또는 모듈 분리 |
| **이중 레포 유지** | 개발 소스 ≠ 공개 문서·Release (지금 구조 그대로) |
| **레포 이름** | `macOS-todoList` 이름은 **당장 변경하지 않음**. README·Release 파일명으로 Windows 안내 |
| **1차 범위 밖** | Microsoft Store, 자동 업데이트(`electron-updater`), 레포 rename |

---

## 2. 이 디렉토리에서 소스를 어떻게 관리하는가

### 2.1 폴더 역할 (루트 `todoList-myfunfun/`)

```
todoList-myfunfun/                 ← 개발 Git (macOS-todoList)
├── main.js                        ← 메인 프로세스 · OS 분기 핵심
├── preload.js
├── widget.html / widget.js / widget.css   ← 메모 UI (공통)
├── memo-list.* / guide.html / tooltip.html
├── scripts/
│   └── start-dev.js               ← 현재 mac 전용(dist .app 실행)
├── build/                         ← 아이콘(icns/png) · Windows용 ico 추가 예정
├── docs/                          ← 개발·배포·포팅 문서
├── public-release-work/           ← 공개 Git 서브모듈 (macOS-todoList-myfunfun)
├── dist/                          ← 빌드 산출물 (gitignore)
└── package.json                   ← electron-builder mac · win 타깃 추가 예정
```

- **새 폴더로 앱 전체를 복사하지 않습니다.**
- Windows 전용 로직이 커지면 선택적으로:
  - `platform/mac.js` — Dock, 메뉴바 편집, dmg 관련
  - `platform/win.js` — 작업 표시줄 트레이, NSIS, Ctrl 단축키 보조
  - `main.js`는 진입점·공통 IPC만 유지

### 2.2 Git 레포 2개 (변경 없음)

| 작업 | 경로 | GitHub | 올리는 것 |
|------|------|--------|-----------|
| **개발** | `todoList-myfunfun/` (루트) | `seonjaeLee/macOS-todoList` | 앱 소스, `main.js`, `package.json`, `docs/*` |
| **공개** | `public-release-work/` | `seonjaeLee/macOS-todoList-myfunfun` | README, `releases/*.md`, 사용자 안내 |

커밋 전 항상:

```bash
pwd && git remote -v && git status
```

- 공개 문서만 수정했으면 → **`public-release-work/` 안에서** commit / push
- 코드 수정이면 → **루트**에서 commit / push 후, 필요 시 서브모듈 포인터 갱신

### 2.3 서브모듈 갱신 (공개 문서 반영 후)

```bash
# 개발 레포 루트
git add public-release-work
git commit -m "chore: public-release-work 서브모듈 갱신"
```

### 2.4 레포 이름(`macOS-…`)과 URL

- **지금 단계:** rename 하지 않음 → clone URL·북마크 유지
- **나중에 rename 시:** GitHub Settings에서 변경 → 예전 URL은 리다이렉트 → 로컬 `git remote set-url` 갱신 → `.gitmodules` URL 수정
- 제품·README 문구는 **「macOS / Windows 데스크톱 메모」** 로 표기 가능

---

## 3. 코드: 공통 vs 플랫폼별

### 3.1 그대로 쓰는 것 (공통)

- 메모 UI: `widget.html`, `widget.js`, `widget.css`
- 메모 목록: `memo-list.*`
- 데이터: `~/Library/Application Support/...` (mac) / `%APPDATA%/...` (win) — Electron `userData`가 OS별로 자동 분리
- IPC·`widgets.json` 스키마, 접기/펼치기, 열 정렬(`reflowColumn`), 개요·할 일 편집
- `tooltip.html` (Windows는 이미 `tooltip` 타입 사용 중)

### 3.2 mac 전용 (유지·분리 후보)

| 항목 | 위치 | 비고 |
|------|------|------|
| Dock / `accessory` | `configureAppPresentation()` | Windows 무시 |
| 앱 메뉴 **편집**(복사/붙여넣기) | `setupApplicationMenu()` | mac만; Windows는 메뉴·가속키 다른 방식 |
| 개발 실행 | `scripts/start-dev.js` | dist `.app` — Windows용 `start-dev-win.js` 또는 `electron .` |
| 빌드 | `package.json` → `mac`, dmg | |
| 툴팁 창 | `panel` + `floating` | Windows는 `tooltip` |

### 3.3 Windows에서 새로/다르게 할 것

| 항목 | mac | Windows (계획) |
|------|-----|----------------|
| 백그라운드 아이콘 | 메뉴바 트레이 | **작업 표시줄 트레이** (같은 `Tray` API, 위치만 다름) |
| 설치 파일 | `.dmg` | **NSIS installer** 또는 portable `.exe` |
| 단축키 | `Cmd` | **`Ctrl`** (편집·복사/붙여넣기) |
| 창 프레임 | frameless | 동일 가능, **테스트 필수** |
| 항상 위 | `setAlwaysOnTop` | 동일 API, 동작 확인 |
| 로그인 시 실행 | `setLoginItemSettings` | 동일 API 지원, UI 문구만 정리 |

### 3.4 분기 작성 규칙 (개발 시)

```javascript
// 권장: 짧은 분기는 인라인
if (process.platform === 'darwin') { ... }
else if (process.platform === 'win32') { ... }

// 파일이 길어지면 platform/mac.js · platform/win.js 로 이동
```

- **공통 파일에 mac 전용 하드코딩 추가 금지** (가능하면 분기 또는 platform 모듈)
- Windows 작업 시 **mac 회귀 테스트** (`npm start` / dmg) 필수

---

## 4. 빌드·실행 환경

### 4.1 현재 (mac)

| 명령 | 용도 |
|------|------|
| `npm start` | `dist/...app` 실행 (mac, `scripts/start-dev.js`) |
| `npm run build:release` | `dist/*.dmg` |
| `npm run verify` | 문법 검사 |

### 4.2 추가 예정 (Windows)

| 명령 (안) | 용도 |
|-----------|------|
| `npm run start:electron` | OS 무관 Electron 호스트 (이미 있음) |
| `npm run build:win` | portable `.exe` (Windows PC 또는 Actions) |
| `npm run icons:win` | `build/icon.ico` 생성 (`icon.png` 동일 디자인) |
| `npm run build:win:dir` | unpacked dir (디버그용) |

**Mac에서 `npm run build:win`:** Wine·다운로드로 **수 분~십 수 분** 걸릴 수 있고, Cursor **모니터링/샌드박스 권한** 창이 뜰 수 있음 → **Actions 사용 권장**.

**빌드 머신**

- Windows `.exe`는 **Windows 환경** 또는 **GitHub Actions `windows-latest`** 에서 생성
- Mac만 있는 경우 → **CI로 Windows 아티팩트** 받는 방식 권장

### 4.3 아이콘

| OS | 파일 (예정) |
|----|-------------|
| mac | `build/icon.icns` (기존, 디자인 변경 금지 — `current_task.md`) |
| win | `build/icon.ico` **추가** (동일 디자인에서 변환) |

---

## 5. 버전·릴리스 정책 (안)

| 시나리오 | 버전 예 |
|----------|---------|
| mac 1.1.0 유지, Windows 첫 공개 | **1.2.0** — Release에 dmg + exe |
| mac 버그만 먼저 | **1.1.1** (mac만) → Windows는 **1.2.0** |
| 양쪽 동시 버그 수정 | **1.1.1** — dmg·exe 둘 다 |

공개 Release Assets (예):

- `todoList-myfunfun-1.2.0-arm64.dmg`
- `todoList-myfunfun-1.2.0-win-x64.exe` (또는 Setup.exe)

`public-release-work/releases/vX.Y.Z.md`에 OS별 설치 안내 구분.

---

## 6. 작업 단계 (권장 순서)

### Phase 0 — 계획 (지금)

- [x] 본 문서 작성
- [x] Windows 빌드 환경: **GitHub Actions `windows-latest`** (Mac 로컬 크로스 빌드는 느리고 권한·Wine 이슈 가능)
- [x] 첫 Windows 공개 목표 버전: **1.2.0** (mac 1.1.0 유지, Windows는 1.2.0에 exe)

### Phase 1 — 빌드만 (실행 최소)

- [x] `package.json`에 `win` 타깃·`npm run build:win`·`scripts/generate-win-icon.js`
- [x] `.github/workflows/build-windows.yml` (푸시/수동 실행 → exe 아티팩트)
- [ ] Actions에서 빌드 성공 후 `.exe` 다운로드·Windows PC에서 실행·메모 1개 생성

### Phase 2 — OS 분기

- [x] `setupApplicationMenu` — Windows 파일·편집·메모·종료
- [x] 트레이·작업 표시줄·항상 위·exe 아이콘 (1차 코드 반영, **집 PC 재테스트 필요**)
- [x] `widget.css` `platform-win32` 타이틀바·＋ 축소
- [ ] `scripts/start-dev` — Windows 개발 실행 경로
- [ ] `widget.js` 단축키 `Ctrl` (제목·할 일 입력)

### Phase 3 — 품질·배포

- [ ] reflow·접기/펼치기·툴팁 Windows 회귀
- [ ] `guide.html` Windows 문단 추가
- [ ] `docs/release-notes-v1.2.0.md` · 공개 `releases/` · GitHub Release (exe)
- [ ] `history.md` 기록

### Phase 4 — (선택, 이후)

- [ ] 레포 rename (OS 중립 이름)
- [ ] `electron-updater`
- [ ] Microsoft Store

---

## 7. 테스트 체크리스트 (Windows)

- [ ] 설치·실행·종료·재실행
- [ ] 메모 추가·접기/펼치기·열 정렬(1px)
- [ ] 제목·할 일·개요 편집, Ctrl+C/V/A
- [ ] 더보기·우클릭 메뉴(다크 스타일)
- [ ] 메모 목록·항상 위에 띄우기
- [ ] `widgets.json` 유지(업데이트 후 데이터 남는지)
- [ ] 다중 모니터·DPI (가능 시)

---

## 8. 문서 갱신 맵

| 변경 시 | 갱신할 파일 |
|---------|-------------|
| 포팅 진행·완료 | `history.md`, 본 문서 체크박스 |
| 다음 작업 | `current_task.md` |
| 개발자 빌드 | 루트 `README.md` |
| 사용자 설치 | `public-release-work/README.md`, `releases/vX.Y.Z.md` |
| 배포 절차 | `docs/release.md` |

---

## 9. 하지 않을 것 (1차)

- 폴더 전체 복사·`todoList-windows/` 별도 레포
- mac / Windows **별도 Git 히스토리**
- dmg 없이 Windows만 따로 소스 레포 분리
- 아이콘 디자인 변경 (`build/icon.icns` / `icon.png` 교체)

---

## 10. 요약

1. **개발 소스는 지금 루트 레포 하나** — Windows는 분기·빌드 타깃만 추가  
2. **공개는 `public-release-work` 서브모듈** — exe·설치 안내는 Release Assets  
3. **레포 이름은 나중에** — 지금은 문서·파일명으로 Windows 표기  
4. **다음 실무 작업** — Phase 1: `package.json` Windows 빌드 + exe 1회 생성
