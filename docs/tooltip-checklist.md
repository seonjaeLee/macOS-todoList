# 툴팁 수정 체크리스트

툴팁은 **한 파일이 아니라 네 군데가 한 세트**입니다. 하나만 바꾸고 빌드하면 증상(세로 줄, 이상한 위치, 아예 안 뜸)이 그대로일 수 있습니다.

## 관련 파일

| 파일 | 역할 |
|------|------|
| `widget.js` | `[data-tooltip]` 호버 → IPC payload (`anchorLeft`, `anchorTop`, `text`, `preferBelow`) |
| `preload.js` | `showTooltip` / `hideTooltip` / `getWindowBounds` 노출 |
| `main.js` | 공유 `tooltipWin` 생성, 측정(`layoutTooltipContent`), 화면 좌표 배치 |
| `tooltip.html` | 말풍선 DOM·스타일 (별도 panel 창에 로드) |

`widget.css`의 `.widget [data-tooltip]::before`는 **비활성**입니다. CSS 툴팁과 panel 툴팁을 동시에 쓰지 않습니다.

---

## 수정 전

- [ ] **어느 창**을 고치는지 정했는가? (메모 `widget` / 메모 목록 `memo-list` — 목록은 아직 CSS `::before` 툴팁일 수 있음)
- [ ] `npm start`로 먼저 확인할지, `npm run build` 후 `/Applications`로 확인할지 정했는가?

---

## 코드 수정 시 (세트로 맞출 것)

### `widget.js`

- [ ] `showTooltip` payload에 **`anchorLeft` / `anchorTop`** (창 기준)을 보내는가?
- [ ] `main.js`가 기대하는 필드명과 **동일**한가? (`anchorScreenX` 등 구 필드명과 혼용 금지)
- [ ] `mousedown`에서 `hideTooltip` 호출하지 않는가? (표시 직전에 사라짐)
- [ ] `tooltipRequestId`로 show/hide **경쟁**을 막는가?

### `main.js`

- [ ] `layoutTooltipContent`가 있는가? (`measureTooltipSize` + `window.setTooltipContent` **구 방식만** 남아 있지 않은가)
- [ ] 측정 전 툴팁 창을 **넓게** 잡는가? (`TOOLTIP_MEASURE_W` / `TOOLTIP_MEASURE_H`, 오프스크린 `setBounds`)
- [ ] 화면 좌표 = `ownerWin.getBounds()` + `anchorLeft` / `anchorTop` 인가?
- [ ] `tooltip.html` 로드 완료 대기(`ensureTooltipPageReady`)가 있는가?

### `tooltip.html`

- [ ] `tip-svg` / `tip-shape` / `tip-text` id가 `main.js`의 `executeJavaScript`와 일치하는가?
- [ ] 말풍선+화살표가 **SVG 한 경로**인가? (HTML+별도 SVG 화살표는 틈·막 현상 유발)
- [ ] 그림자는 SVG `feDropShadow`인가? (`filter: drop-shadow` / `box-shadow`만 쓰면 투명 창에서 헤일로 가능)

### `package.json` → `build.files`

- [ ] `"tooltip.html"`이 **포함**되어 있는가? (빠지면 설치 앱에서 툴팁 페이지 로드 실패)

---

## 로컬 확인 (`npm start`)

1. [ ] 다른 인스턴스 **완전 종료** (`Cmd+Q`)
2. [ ] 프로젝트 루트에서 `npm start`
3. [ ] 메모 창에서 타이틀바 버튼(열기구·＋·색상환·✕·더보기)에 **0.4초** 정도 호버
4. [ ] 말풍선이 **아이콘 근처**(기본: 버튼 **위**)에 뜨는가?
5. [ ] 긴 문구(`항상 위에 띄우기`)가 **가로 말풍선**으로 보이는가? (세로 줄 X)
6. [ ] `Cmd+R`로 새로고침 후에도 동일한가?

개발 중 터미널에 `툴팁 표시 실패:` 로그가 없는지 확인합니다.

---

## 수정 직후 최소 검수 (필수)

코드 저장 후, **실행 전**에 한 번씩 돌립니다. `anchorTop` 중복 선언 같은 오류는 여기서 잡힙니다.

```bash
npm run verify
```

- [ ] `syntax: OK` (에러 없이 끝나는지)
- [ ] `main.js`에 `const anchorTop = anchorScreenY`처럼 **payload `anchorTop`과 이름이 겹치는 선언**이 없는지

`npm run build`는 위 `verify`를 **자동으로 먼저** 실행합니다.

---

## 빌드·설치본 확인 (`npm run build`)

1. [ ] `npm run build` 성공 (`verify` 통과 포함)
2. [ ] **`Cmd+Q`로 앱 완전 종료** (단일 인스턴스 — 이 단계 생략 시 옛 프로세스가 계속 돌 수 있음)
3. [ ] **`/Applications/todoList-myfunfun.app`** 실행 (`dist/*.dmg`만 열지 말 것 — dmg는 별도로 오래된 경우 있음)
4. [ ] 위 “로컬 확인” 3~5번을 설치 앱에서 반복

### 설치본에 최신 코드가 들어갔는지 (선택, 권장)

소스 수정 시각이 `app.asar`보다 **늦으면** 빌드가 안 된 것입니다.

```bash
stat -f "%Sm %N" main.js widget.js tooltip.html
stat -f "%Sm %N" /Applications/todoList-myfunfun.app/Contents/Resources/app.asar
```

`app.asar` 안에 새 로직이 있는지:

```bash
npx @electron/asar extract /Applications/todoList-myfunfun.app/Contents/Resources/app.asar /tmp/todo-asar-check
grep -E "layoutTooltipContent|anchorLeft|TOOLTIP_MEASURE" /tmp/todo-asar-check/main.js /tmp/todo-asar-check/widget.js
```

기대 결과 예:

- `main.js`: `layoutTooltipContent`, `TOOLTIP_MEASURE_W`
- `widget.js`: `anchorLeft`
- **없어야 함**: `measureTooltipSize`만 있는 구버전, `window.setTooltipContent`

---

## 자주 나오는 증상 ↔ 원인

| 증상 | 흔한 원인 |
|------|-----------|
| 아예 안 뜸 | `main.js`↔`tooltip.html` API 불일치, 로드 전 `executeJavaScript`, `mousedown`으로 즉시 hide |
| 세로 검은 줄 | 툴팁 창이 **좁은 상태**에서 측정 후 그 폭으로 `setBounds` |
| 본문 한참 아래 | `preferBelow: true` + 잘못된 높이 측정, 또는 `anchorScreenX/Y` 구 payload와 `anchorLeft` 혼용 |
| 빌드했는데 그대로 | `app.asar`가 소스보다 이전, `Cmd+Q` 안 함, dmg만 실행, `main.js`만 구버전 |

---

## IPC 계약 (참고)

`widget.js` → `show-tooltip`:

```js
{
  anchorLeft: number,   // 메모 창 content 기준
  anchorTop: number,
  anchorWidth: number,
  anchorHeight: number,
  text: string,
  preferBelow: boolean, // 타이틀바: false = 버튼 위(도크 스타일)
}
```

`main.js`는 `ownerWin.getBounds()`와 합쳐 **화면 좌표**로 툴팁 창을 배치합니다.

---

## 관련 문서

- [타이틀바 간격·아이콘](./titlebar-styling.md) — CSS 변수, `npm start` + `Cmd+R` 확인 흐름
