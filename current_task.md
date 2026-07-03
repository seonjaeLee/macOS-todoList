# 예정 작업

- **Windows 포팅 (이어서)** — `docs/windows-port.md` 참고. 코드 반영은 이번에 Phase 2 마무리·Phase 3 일부까지 진행했고, 아래는 전부 **집 PC 실기 테스트만 남은 항목**(코드는 완료):
  - [x] Actions `3f4b52d` exe → **트레이 메뉴가 메모 위에** 표시되는지 재확인 — 2026-07-03 집 PC 확인 완료(아래 참고)
  - [ ] 항상 위·툴팁·목록 여백·종료 경로 최종 체크
  - [ ] `npm start`(Windows) — `dist/win-unpacked` 실행 경로 신규 추가분 실행 확인(`scripts/start-dev.js`, `history.md` 2026-07-02)
  - [ ] `widget.js` 단축키 `Ctrl`(제목·할 일 입력) 실기 확인 — 코드는 mac과 공통이라 감사만 완료(`history.md` 2026-07-02)
  - [x] 초안 노트(draft-note) 트레이 메뉴 항목 Windows 실기 동작 확인 — 2026-07-03 집 PC 확인 완료(아래 참고)
  - [ ] 초안 노트 붙여넣기 후 실행취소/다시실행(`Cmd+Z`/`Cmd+Shift+Z` → Windows는 `Ctrl+Z`/`Ctrl+Shift+Z`) 동작 확인(`widget.js` `handleClipboardShortcut`, 이번엔 mac만 검증, `history.md` 2026-07-02)
  - [ ] 초안 노트 볼드/취소선/하이라이트 단축키(mac `Cmd+B`/`Cmd+Shift+X`/`Cmd+Shift+H` → Windows는 `Ctrl+B`/`Ctrl+Shift+X`/`Ctrl+Shift+H`) 동작 확인(`widget.js` `handleFormatShortcut`, 이번엔 mac만 검증, `history.md` 2026-07-02)
  - [ ] `guide.html` Windows 문단(플랫폼별 안내 전환) 실기 확인(`history.md` 2026-07-02)
  - [ ] Phase 3 잔여: v1.2.0 릴리스 문서·공개 Release
- 메모 백업 기능 추가 예정

# 완료·진행 중

- v1.0.0 1차 dmg 공개 배포 완료
- v1.1.0 mac — 기능·dmg Release 완료 (`history.md` 2026-05-26)
- **초안 노트(draft-note) 싱글톤 위젯** — mac `npm start` 검증 완료 (`history.md` 2026-06-28)
- **초안 노트 볼드/취소선/하이라이트 서식** — mac `npm start` 검증·`/Applications` 빌드 완료 (`history.md` 2026-07-02)
- **Windows Phase 1** — Actions 빌드·exe 실행·메모 UI 기본 동작 확인(집 PC)
- **Windows Phase 2** — 1~2차 피드백 반영 커밋 완료; **트레이 메뉴 z-order(`3f4b52d`) 집 PC 실기 확인 완료**(`history.md` 2026-07-03); `scripts/start-dev` Windows 경로·`widget.js` Ctrl 단축키 코드 반영 완료(집 PC 실기 확인 대기, `history.md` 2026-07-02)
- **Windows Phase 3 일부** — `guide.html` 플랫폼별 안내(맥/윈도우 전환) 추가 완료(집 PC 실기 확인 대기, `history.md` 2026-07-02)
- **초안 노트 Windows 실기** — 트레이 메뉴 항목 노출·클릭 동작 집 PC 확인 완료(`history.md` 2026-07-03); 붙여넣기 undo/redo·서식 단축키는 아직 확인 대기

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
  - `docs/windows-port.md`: Windows 포팅·**단일 레포 소스 관리** 계획

# Git 운영 규칙 (개발/공개 분리)

- 개발용 커밋/푸시: `todoList-myfunfun` 루트 (`macOS-todoList`)
- 공개용 커밋/푸시: `todoList-myfunfun/public-release-work` (`macOS-todoList-myfunfun`)
- 커밋 전 `pwd` → `git remote -v` → `git status` 로 대상 레포 확인
- 공개 문서 수정 후 VS Code 루트에서 커밋하지 말 것 → `public-release-work/WORKFLOW.md` 참고
