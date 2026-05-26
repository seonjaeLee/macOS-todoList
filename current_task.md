# 예정 작업

- 메모 백업 기능 추가 예정

# 완료·진행 중

- v1.0.0 1차 dmg 공개 배포 완료
- v1.1.0 기능 개발 완료 (`package.json` `1.1.0`, 항상 위에 띄우기·가이드·툴팁) — `history.md` 2026-05-26 참고
- v1.1.0 GitHub Release·dmg 업로드 — `docs/release-notes-v1.1.0.md` 초안 기준, `npm run build:release` 후 `public-release-work` 반영 (`docs/release.md`)

# 절대 수정 금지

- `build/icon.icns` · `build/icon.png` **디자인/파일 교체** (아이콘 이미지 자체 변경)
- Dock·트레이 로직은 `main.js`의 `configureAppPresentation` · `setupTray`만 수정 → **`docs/icon-policy.md` 필독**

# 참고사항

- 확인 가능하도록 빌드 배포
- 수정 내용 확인 후 커밋·푸시
- 진행한 수정 내용은 `history.md`에 기록할 것
- **문서 역할**
  - 루트 `README.md`: 개발자용 클론·로컬 빌드·`/Applications` 설치
  - `public-release-work/README.md`: 일반 사용자용 Releases·dmg 설치 가이드

# Git 운영 규칙 (개발/공개 분리)

- 개발용 커밋/푸시: `todoList-myfunfun` 루트 (`macOS-todoList`)
- 공개용 커밋/푸시: `todoList-myfunfun/public-release-work` (`macOS-todoList-myfunfun`)
- 커밋 전 `pwd` → `git remote -v` → `git status` 로 대상 레포 확인
- 공개 문서 수정 후 VS Code 루트에서 커밋하지 말 것 → `public-release-work/WORKFLOW.md` 참고
