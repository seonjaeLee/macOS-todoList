# todoList-myfunfun

macOS 메뉴바 기반 포스트잇 스타일 할일 관리 앱

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

### 3. 빌드 및 /Applications 복사

```bash
npm run build
```

빌드 완료 후 `/Applications/todoList-myfunfun.app` 이 자동으로 생성됩니다.

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
- 닫은 메모 상태 재시작 후 유지
- 메뉴바 아이콘 → 사용 가이드 제공
- 로그인 시 자동 실행 설정

---

## 아이콘 정책 (고정)

- 앱 아이콘(실행/종료 시 Dock 아이콘)은 `build/icon.icns`를 기준으로 사용합니다.
- 개발 실행(`npm start`)에서는 동일 디자인의 `build/icon.png`를 Dock 아이콘으로 강제 적용합니다.
- 트레이 아이콘은 코드에서 템플릿 PNG를 생성해 사용하며, 별도 `todoList-icon.png` 파일은 사용하지 않습니다.

---
