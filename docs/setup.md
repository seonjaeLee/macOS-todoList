# 개발 환경 재설정 가이드 (다른 장비용)

이 프로젝트는 아래 두 레포를 함께 사용합니다.

- 개발 레포(비공개): `macOS-todoList`
- 공개 레포(일반 사용자용): `macOS-todoList-myfunfun`

## 1) 개발 레포 클론

```bash
git clone https://github.com/seonjaeLee/macOS-todoList.git
cd macOS-todoList
```

## 2) 공개 레포를 하위 폴더로 클론

```bash
git clone https://github.com/seonjaeLee/macOS-todoList-myfunfun.git public-release-work
```

완료되면 아래 구조가 됩니다.

```text
macOS-todoList/               # 개발 작업/커밋/푸시
└── public-release-work/      # 공개용 문서/릴리스 작업/커밋/푸시
```

## 3) 작업 구분 규칙

- 개발 코드 변경/커밋/푸시: `macOS-todoList` 폴더에서만 수행
- 사용자 공개 문서/릴리스 관련 변경: `public-release-work` 폴더에서만 수행 (자세한 내용은 `public-release-work/WORKFLOW.md`)

## 4) 커밋 전 필수 확인

아래 3개를 항상 먼저 확인합니다.

```bash
pwd
git remote -v
git status
```

## 5) 참고

- `public-release-work`는 서브모듈로 연결되어 있습니다. 공개 문서 수정 후에는
  `public-release-work`에서 커밋·푸시한 뒤, 개발 레포에서 서브모듈 참조를 갱신합니다.
