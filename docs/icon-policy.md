# 앱 아이콘 정책 (재발 방지)

## 핵심

| 명령 | 실행 주체 | Dock |
|------|-----------|------|
| **`npm start`** | `dist/.../todoList-myfunfun.app` (빌드된 **진짜 앱**) | 체크 아이콘, **정상 크기** |
| **`npm run start:electron`** | `electron .` (Electron 호스트) | Electron·이상 타일 **나올 수 있음** — 일상 개발에 쓰지 않음 |
| **`npm run build` / 설치본** | `/Applications/...` | 동일 |

`electron .`로는 Dock에 **Electron.app 타일**이 반드시 남습니다. `dock.hide()`·`accessory`만으로는 막히지 않았습니다.

## `npm start` 동작

1. 소스가 `app.asar`보다 새로우면 `npm run build:dir` (자동)
2. `dist/mac-arm64/todoList-myfunfun.app` 실행
3. 설치본과 같은 번들·**같은 체크 Dock 아이콘**

코드 수정 후: `npm start` 한 번 더 (변경 시 자동 재빌드) 또는 `npm run build:dir`.

## 절대 하지 말 것

- `build/icon.icns` · `build/icon.png` **디자인 교체**
- 일상 개발에 `electron .` / `npm run start:electron` 사용
- 개발 모드 `app.setName` · `dock.setIcon`
- 설치본에서 `dock.setIcon`

## 실행 전

Dock·메뉴바에서 **todoList / Electron 전부 `Cmd+Q`** 후 `npm start`.

`/Applications` 설치본과 dist 앱은 **싱글 인스턴스**라 하나만 켜집니다.

## 코드

- `scripts/start-dev.js` — `npm start` 진입점
- `main.js` → `configureAppPresentation()` (packaged만 Dock show)
