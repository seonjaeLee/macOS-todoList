# 타이틀바 간격·아이콘 직접 조정하기

`/Applications`에 설치된 앱은 **빌드할 때 CSS가 묶여** 있어서, `widget.css`만 고쳐도 화면에 바로 안 바뀝니다.

## 빠르게 확인하는 방법

1. 메뉴바 앱 **완전 종료** (`Cmd+Q`)
2. 프로젝트 폴더에서:

```bash
npm start
```

3. `widget.css` **맨 위** `:root` 변수만 수정:

| 변수 | 의미 | 기본값 |
|------|------|--------|
| `--tb-toolbar-gap` | ＋·색상환 등 기본 간격 | `6px` |
| (열기구 `margin-right: -4px`) | 열기구↔＋만 추가로 4px 좁힘 | 고정 |
| `--tb-gap` | 툴바 묶음 ↔ 닫기 | `10px` |
| `--tb-btn` | 버튼 칸 크기 | `22px` |
| `--tb-add-size` | ＋ 크기 | `26px` |
| `--tb-float-icon` | 열기구 SVG | `15px` |
| `--tb-palette-size` | 색상환 지름 | `18px` |

4. 메모 창을 연 상태에서 **`Cmd+R`** → 새로고침 후 확인

5. 만족하면:

```bash
npm run build
```

## 예시

```css
:root {
  --tb-gap: 12px;        /* 색상환 ↔ 닫기 포함 간격 넓히기 */
  --tb-add-size: 26px;   /* ＋ 더 크게 */
}
```

## 관련 문서

- [툴팁 수정 체크리스트](./tooltip-checklist.md) — 타이틀바 아이콘 툴팁(panel 창), 빌드·`app.asar` 검증
