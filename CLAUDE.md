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
- `ConfigProvider`(`src/app/providers.tsx`)에 `locale`만 지정돼 있고 `theme`은 없다.
  즉 antd 기본 토큰을 그대로 쓰는 상태다

## UI 작업 규칙

**데스크톱 전용이다.** `src/index.css` 가 `#root { min-width: 1024px }` 로 못박아 두었고,
좁은 창에서는 가로 스크롤을 허용한다. 모바일 반응형 작업은 하지 않는다.

**색·간격·타이포는 `ConfigProvider`의 `theme` 한 곳에서 파생시킨다.** 컴포넌트마다
`style`에 색상 리터럴을 박지 않는다. 새 토큰이 필요하면 antd MCP로 실제 토큰 키를
확인한 뒤 추가한다.

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
