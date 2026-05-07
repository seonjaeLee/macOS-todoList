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
git clone https://github.com/seonjaeLee/macOS-todoList-myfunfun.git public-user-repo
```

완료되면 아래 구조가 됩니다.

```text
macOS-todoList/               # 개발 작업/커밋/푸시
└── public-user-repo/         # 공개용 문서/릴리스 작업/커밋/푸시
```

## 3) 작업 구분 규칙

- 개발 코드 변경/커밋/푸시: `macOS-todoList` 폴더에서만 수행
- 사용자 공개 문서/릴리스 관련 변경: `public-user-repo` 폴더에서만 수행

## 4) 커밋 전 필수 확인

아래 3개를 항상 먼저 확인합니다.

```bash
pwd
git remote -v
git status
```

## 5) 참고

- 개발 레포 `.gitignore`에 `public-user-repo/`가 등록되어 있어,
  개발 레포 커밋에 공개 레포 폴더가 섞이지 않도록 처리되어 있습니다.
