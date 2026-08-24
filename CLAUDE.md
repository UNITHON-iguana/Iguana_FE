# 현장노트 AI (Iguana_FE)

건설 현장 사진으로 사진대지를 만드는 내부 업무 도구. 프로젝트별로
계획 데이터(엑셀) 등록 → 현장 사진 업로드·AI 분석 → 검수 → 계획 대비 현황 비교 →
엑셀 내보내기 순서로 진행한다. 라우팅은 이 흐름을 그대로 따른다
(`src/app/router.tsx`, `src/layouts/AppLayout.tsx`의 `PROJECT_MENU`).

## 스택

- React 19 + TypeScript + Vite, react-router(`createBrowserRouter`), TanStack Query
- UI는 antd 6 + `@ant-design/icons`. antd API가 헷갈리면 antd MCP(`.mcp.json`)로 확인한다
- 엑셀 입출력은 exceljs, 날짜는 dayjs(`ko` 로캘)
- `@/` 는 `src/` 별칭. Prettier: 세미콜론 없음, 작은따옴표, printWidth 100

## 현재 상태

- `src/api/*.ts` 는 전부 `src/mocks/` 의 인메모리 데이터를 돌려준다. 실제 HTTP 클라이언트
  `src/lib/api.ts` 는 작성만 되어 있고 아직 아무 데서도 import하지 않는다.
  백엔드 연동 시 이 둘을 바꿔 끼운다
- `ConfigProvider`(`src/app/providers.tsx`)에 한국어 로캘과 `src/app/theme.ts`의
  디자인 토큰이 연결돼 있다. `cssVar` 모드라 토큰이 `--ant-*` CSS 변수로도 나간다

## UI 작업 규칙

**데스크톱 전용이다.** `src/index.css` 가 `#root { min-width: 1024px }` 로 못박아 두었고,
좁은 창에서는 가로 스크롤을 허용한다. 모바일 반응형 작업은 하지 않는다.

### 디자인 방향 — 엑셀처럼 보이게 한다

사용자가 하루 종일 엑셀을 쓰는 사무·공무 담당자이고 결과물 자체가 엑셀 사진대지라,
화면과 출력물이 같은 인상을 줘야 한다.

- **격자가 주인공이다.** 표는 `@/components/DataTable`을 쓴다 (`bordered` + `size="small"`이
  기본값). antd `Table`을 직접 쓰지 않는다 — 화면마다 옵션을 반복하면 언젠가 하나가 빠진다
- 모서리는 각지게. `borderRadius`는 2 이하
- 수량 열은 `@/components/columns`의 `numberColumn()`을 쓴다 (우측 정렬, 없는 값은 `-`)
- 색은 회색 계열이 기본이다. 녹색(`colorPrimary`)은 저장·생성·내려받기처럼 사용자가
  결과를 만드는 동작에만 붙인다
- 히어로 섹션, 큰 여백, 연출된 모션은 쓰지 않는다

**색·간격·타이포는 `src/app/theme.ts` 한 곳에서만 정의한다.**

- 컴포넌트(tsx)에서는 `theme.useToken()`으로 읽는다. 색상 리터럴은 ESLint가 막는다
- antd 토큰에 대응이 없는 개념(사진대지 양식 고유색 등)은 `theme.ts`가 export 한 상수를 쓴다
- 인쇄용 CSS는 `var(--ant-color-border)` 같은 CSS 변수를 쓴다 (`cssVar` 모드)
- **새 antd 컴포넌트에는 전역 토큰이 자동으로 적용된다.** antd는 각 컴포넌트의 고유
  토큰을 `prepareComponentToken(token)`으로 전역 토큰에서 파생시킨다. 아직 한 번도 안 쓴
  컴포넌트도 이미 반경 2, 폰트 12, 높이 28, 녹색 주색으로 나온다.
  `theme.ts`의 `components`는 그 파생 결과가 우리 방향과 어긋나는 것만 손보는 자리다
  (예: `Table.headerBg`는 antd 기본 회색이 우리가 원한 회색이 아니라 덮었다).
  새 컴포넌트를 넣을 때 먼저 그냥 써보고, 어긋나는 값이 있을 때만 오버라이드를 추가한다.
  토큰 키 이름은 antd MCP의 `antd_token`으로 확인한다
  (MCP는 antd 기본값을 알려줄 뿐 우리가 정한 방향은 모른다)

**UI 문구는 한국어다.** 상태 라벨은 `src/lib/constants.ts`에 모여 있고
(`PHOTO_STATUS_LABEL`, `REVIEW_STATUS_LABEL`, `COMPARE_STATUS_LABEL`),
새 상태 문구도 여기에 둔다. 화면마다 같은 개념을 다른 말로 부르지 않는다.

### frontend-design 스킬의 적용 범위

이 저장소에서는 `frontend-design` 스킬을 다음 범위로만 적용한다.

적용한다:

- UX 라이팅 전반 — 시스템 용어가 아닌 사용자 용어, 능동태, 버튼과 결과 토스트의
  어휘 일치, 에러는 사과 대신 원인과 다음 행동을 밝힐 것, 빈 화면은 할 일을 제시할 것
- 토큰 규율과 자가 비평 패스
- 품질 바닥선 중 키보드 포커스 가시성과 `prefers-reduced-motion`

적용하지 않는다:

- 히어로 섹션, 시그니처 요소, "미적 리스크 하나 감수" 조항, 연출된 모션
- 모바일 반응형 (위 데스크톱 전용 규칙이 우선한다)

데이터 밀도가 높은 업무 화면이라 스킬이 말하는 "minimal direction"에 해당한다.
과감함이 아니라 간격·타입·정렬의 정밀함으로 품질을 낸다.
소개 페이지나 로그인 화면처럼 성격이 다른 화면이 추가되면 그때 이 범위를 다시 정한다.
