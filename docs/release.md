# 배포 절차 체크리스트

개발 레포(`macOS-todoList`)에서 빌드하고, 공개 레포(`macOS-todoList-myfunfun` → `public-release-work`)에 반영합니다.

## 1) 개발 레포 준비

- 기능 개발/수정 완료
- `npm start` 또는 `npm run build`로 로컬 동작 확인
- `npm run verify` 통과 (빌드 시 자동 실행)
- 변경 이력 `history.md` 기록

## 2) 빌드

### 로컬 설치 확인 (`/Applications`)

```bash
npm run build
```

- `verify` 후 arm64 앱을 `/Applications/todoList-myfunfun.app`에 복사
- Apple Silicon 산출물: `dist/mac-arm64/todoList-myfunfun.app`

### GitHub Release용 설치 파일

```bash
npm run build:release
```

- `dist/`에 dmg·zip 생성 (예: `todoList-myfunfun-1.1.0-arm64.dmg`)
- Intel Mac은 별도 빌드 필요 시 `README.md`의 Apple Silicon/Intel 표 참고

배포 전 **`Cmd+Q`로 기존 앱 완전 종료** 후 설치본으로 재검증합니다.

## 3) 공개 레포 반영

`public-release-work` 폴더에서만 커밋/푸시합니다 (`WORKFLOW.md` 참고).

- [ ] `README.md`·`RELEASE_TEMPLATE.md` 등 설치 가이드 최신화
- [ ] `docs/release-notes-v*.md` 초안을 공개용 릴리스 본문에 맞게 반영
- [ ] `releases/`(또는 Release Assets)에 **`.dmg`만** 업로드 (`.blockmap`, `builder-*.yml` 제외)
- [ ] 커밋 전 `pwd` / `git remote -v` / `git status`로 공개 레포인지 확인

개발 레포에서는 서브모듈 포인터 갱신:

```bash
# 개발 레포 루트
git add public-release-work
git commit -m "chore: public-release-work 서브모듈 갱신"
```

## 4) Release 게시

- 개발 레포: 배포 가능 시 태그 `vMAJOR.MINOR.PATCH` (예: `v1.1.0`)
- 공개 레포 GitHub Releases: 태그·본문·dmg 첨부 후 게시

## 5) 배포 후 확인

- [ ] Releases 다운로드 링크 동작
- [ ] dmg → 응용 프로그램 설치 → 첫 실행(미서명 안내) 테스트
- [ ] v1.1.0 기능: 항상 위에 띄우기, 메모 목록 연동, 타이틀바 툴팁 (`docs/release-notes-v1.1.0.md` Test plan)
