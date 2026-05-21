# 예정 작업
- 메모 접기/열기 변환 시 정렬 깨짐 >> 체크
- 메모 백업 기능 추가 예정
- v1.0.0 1차 dmg 공개 배포 완료 (릴리스 운영 안정화 후 후속 버전 준비)

# 절대 수정 금지
- 아이콘 변경

# 참고사항
- 확인 가능하도록 빌드 배포
- 수정내용 확인 후 커밋푸시
- 진행한 수정내용은 history.md에 기록할 것
- readmd.md 는 사용자 설치 가이드 임

# Git 운영 규칙 (개발/공개 분리)
- 개발용 커밋/푸시: `todoList-myfunfun` 루트 (macOS-todoList)
- 공개용 커밋/푸시: `todoList-myfunfun/public-release-work` (macOS-todoList-myfunfun)
- 커밋 전 `pwd` → `git remote -v` → `git status` 로 대상 레포 확인
- 공개 문서 수정 후 VS Code 루트에서 커밋하지 말 것 → `public-release-work/WORKFLOW.md` 참고
