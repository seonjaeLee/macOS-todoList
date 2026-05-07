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

---

## 작업 히스토리 (2026-05-06)

- 트레이 메뉴에서 메모 직접 나열을 제거하고 `메모 목록 열기` 기반 구조로 단순화
- 별도 `메모 목록` 팝업 추가: 열기/닫기, 삭제, 제목 더블클릭 편집 지원
- 메모 목록 팝업을 `사용 가이드` 팝업과 동일한 스타일 톤으로 통일
- 실행 스크립트를 앱 이름(`todoList-myfunfun`) 기준 실행으로 변경
- Dock 아이콘 강제 지정 로직 제거 후 재빌드하여 앱 기본 아이콘(`icon.icns`)으로 복구

## 작업 히스토리 (2026-05-07)

- 메모 목록 UI 개편: 내부 `메모 리스트` 라벨 제거, 항목 `닫기` 버튼 제거, 삭제 버튼 아이콘화
- 말머리 스타일 변경: 원형 → 사각형, 더 얇은 테두리 + 내부색 대비 약간 어두운 톤 적용
- 개별 메모 창 우측 버튼 의미를 `삭제`가 아닌 `창 닫기`로 명확화
- 아이콘 경로 정리: `todoList-icon.png`, `generate-icon.js` 제거 및 트레이 아이콘 코드 생성 방식으로 통일
- 빌드 스크립트 안정화: `/Applications/todoList-myfunfun.app` 기존 앱 삭제 후 새 앱 복사
