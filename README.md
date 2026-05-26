# todoList-myfunfun

macOS 메뉴바 기반 포스트잇 스타일 할일 관리 앱

> **문서 안내**: 이 파일은 **개발 레포**용입니다. 일반 사용자용 dmg 설치 가이드는 공개 레포 [`macOS-todoList-myfunfun`](https://github.com/seonjaeLee/macOS-todoList-myfunfun) / 로컬 `public-release-work/README.md`를 참고하세요.

---

## 실행 환경

- macOS 전용
- Node.js 필요 → [nodejs.org](https://nodejs.org) 에서 설치

---

## 설치 및 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/seonjaeLee/macOS-todoList.git
cd macOS-todoList
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 실행 (`npm start`)

```bash
npm start
```

- `dist/`에 빌드된 **실제 앱**을 실행합니다 (`electron .` 아님 → Dock에 Electron/이상 아이콘 안 뜸).
- 소스 수정 후 다시 `npm start`하면 변경 시 **자동으로 `build:dir`** 후 실행됩니다.
- Dock 체크 아이콘은 **설치본과 동일**합니다. 실행 전 다른 인스턴스는 **`Cmd+Q`로 종료**하세요.
- 아이콘·Dock 정책: **`docs/icon-policy.md`**
- (비상) `npm run start:electron` = 예전 `electron .` 방식 — Dock 문제 재발 가능

### 4. 빌드 및 /Applications 복사

```bash
npm run build
```

빌드 완료 후 `/Applications/todoList-myfunfun.app` 이 자동으로 생성됩니다. (`npm run verify`가 선행됩니다.)

### 5. Release용 dmg·zip (선택)

GitHub Releases 업로드용:

```bash
npm run build:release
```

산출물은 `dist/`에 생성됩니다 (예: `todoList-myfunfun-1.1.0-arm64.dmg`). 배포 절차는 `docs/release.md`를 참고하세요.

---

## ⚠️ Apple Silicon / Intel Mac 주의사항

현재 빌드 스크립트는 **Apple Silicon(arm64)** 기준입니다.

**Intel Mac** 에서 빌드할 경우 `package.json`의 build 스크립트를 아래와 같이 수정하세요:

```json
"build": "electron-builder --mac dir && rm -rf \"/Applications/todoList-myfunfun.app\" && cp -R \"dist/mac/todoList-myfunfun.app\" /Applications/"
```

| 구분 | dist 경로 |
|------|-----------|
| Apple Silicon | `dist/mac-arm64/` |
| Intel Mac | `dist/mac/` |

---

## 주요 기능

- 메모 위젯 생성 / 편집 / 삭제 / 색상 변경
- 할일 추가 / 완료 / 삭제 / 텍스트 수정 (더블클릭)
- 메모 접기 / 펼치기 / 크기 조절 / 자동 정렬
- **항상 위에 띄우기** (열기구 아이콘 · 메모 목록에서도 설정)
- 닫은 메모 상태 재시작 후 유지
- 메뉴바 아이콘 → 사용 가이드 제공
- 로그인 시 자동 실행 설정

---
