import type { ThemeConfig } from 'antd'

/**
 * 디자인 토큰 — 색·간격·타이포는 전부 여기서 파생시킨다.
 *
 * 방향: 엑셀처럼 보이게 한다.
 * 격자가 주인공이고, 모서리는 각지고, 밀도는 높다.
 * 색은 회색 계열이 기본이고 녹색은 주요 액션에만 쓴다.
 *
 * 사용법
 * - 컴포넌트(tsx): `theme.useToken()`으로 읽는다. 색상 리터럴 금지(ESLint가 잡는다).
 * - CSS 모듈: `var(--ant-color-border)` 같은 CSS 변수를 쓴다(cssVar 모드).
 * - antd 토큰에 대응이 없는 개념: 이 파일에서 export 한 상수를 쓴다.
 *
 * 전역 토큰(`token`)은 아직 한 번도 안 쓴 컴포넌트에도 자동으로 적용된다.
 * antd가 각 컴포넌트의 고유 토큰을 `prepareComponentToken(token)`으로 여기서 파생시키기
 * 때문이다. 아래 `components`는 그 파생 결과가 우리 방향과 어긋나는 것만 손보는 자리다.
 */

const FONT_STACK = [
  "'Pretendard Variable'",
  'Pretendard',
  '-apple-system',
  'BlinkMacSystemFont',
  "'Malgun Gothic'",
  'sans-serif',
].join(', ')

/**
 * 주요 액션에만 쓰는 녹색.
 * 저장·생성·내려받기처럼 사용자가 결과를 만드는 동작에만 붙인다.
 */
export const GREEN = '#217346'

/** 격자선 — 화면의 뼈대라 다른 색보다 먼저 정한다 */
export const GRID_LINE = '#d4d8dd'
export const GRID_LINE_SOFT = '#e6e9ec'

/** 표 머리글과 라벨 칸 배경 */
export const HEADER_BG = '#f0f2f4'

/** 사진대지 양식에서 자재명 칸에 쓰는 연녹색 (원본 엑셀 양식과 맞춘 값) */
export const SHEET_CATEGORY_BG = '#eaf0e2'

/** 사진대지의 사진번호 — 원본 양식이 빨간 숫자를 쓴다 */
export const SHEET_SEQ_COLOR = '#c0392b'

export const theme: ThemeConfig = {
  // 토큰을 CSS 변수(--ant-*)로 내보낸다. CSS 모듈에서도 같은 값을 참조할 수 있다.
  // v6에서는 boolean이 아니라 옵션 객체를 받는다 — 빈 객체면 기본 prefix(ant)를 쓴다.
  cssVar: {},

  token: {
    fontFamily: FONT_STACK,
    fontSize: 12,
    fontSizeHeading3: 18,
    fontSizeHeading4: 14,

    // 엑셀에는 둥근 모서리가 없다
    borderRadius: 2,
    borderRadiusLG: 2,
    borderRadiusSM: 2,
    borderRadiusXS: 1,

    // 밀도
    controlHeight: 28,
    padding: 12,
    margin: 12,

    colorPrimary: GREEN,
    colorLink: GREEN,
    colorBorder: GRID_LINE,
    colorBorderSecondary: GRID_LINE_SOFT,

    colorText: '#1f2328',
    colorTextSecondary: '#57606a',
    colorTextTertiary: '#818b98',

    colorBgLayout: '#f6f7f8',

    // 그림자를 걷어내 종이처럼 평평하게 둔다
    boxShadow: 'none',
    boxShadowSecondary: '0 2px 8px rgba(31, 35, 40, 0.08)',
    boxShadowTertiary: 'none',

    wireframe: false,
  },

  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 48,
      headerPadding: '0 16px',
      siderBg: '#fbfcfd',
      bodyBg: '#f6f7f8',
    },

    Table: {
      headerBg: HEADER_BG,
      headerColor: '#1f2328',
      headerSplitColor: GRID_LINE,
      borderColor: GRID_LINE_SOFT,
      headerBorderRadius: 0,
      rowHoverBg: '#f2f7f4',
      cellPaddingBlockSM: 5,
      cellPaddingInlineSM: 8,
      cellFontSizeSM: 12,
    },

    Menu: {
      itemBorderRadius: 2,
      itemHeight: 32,
      itemMarginInline: 4,
      itemMarginBlock: 2,
      subMenuItemBorderRadius: 2,
      itemSelectedBg: '#e8f0ec',
      itemSelectedColor: GREEN,
    },

    Card: {
      headerHeight: 36,
      headerFontSize: 13,
      paddingLG: 12,
    },

    Tabs: {
      horizontalItemPadding: '8px 0',
      horizontalMargin: '0 0 12px 0',
    },

    Progress: {
      defaultColor: GREEN,
    },

    Upload: {
      padding: 8,
    },

    // --- 아래는 아직 화면에 다 쓰이지 않은 컴포넌트들 ---
    // 반경·폰트·높이는 전역 토큰에서 이미 파생되므로 여기 없어도 된다.
    // 그림자 제거나 옵션 배경처럼 파생 결과가 우리 방향과 어긋나는 값만 덮어둔다.

    Input: {
      paddingBlockSM: 2,
      paddingInlineSM: 6,
      activeShadow: 'none',
      errorActiveShadow: 'none',
      warningActiveShadow: 'none',
    },

    InputNumber: {
      activeShadow: 'none',
    },

    Select: {
      optionSelectedBg: '#e8f0ec',
      optionHeight: 28,
      optionPadding: '4px 8px',
    },

    DatePicker: {
      activeShadow: 'none',
      cellHeight: 22,
      cellWidth: 32,
    },

    Modal: {
      // 제목 줄에 회색 띠를 두르지 않는다 — 표의 머리글이 아니라 그냥 제목이다
      headerBg: '#ffffff',
      titleFontSize: 14,
      contentBg: '#ffffff',
      padding: 16,
      paddingContentHorizontalLG: 16,
    },

    Drawer: {
      footerPaddingBlock: 8,
      footerPaddingInline: 12,
    },

    Descriptions: {
      labelBg: HEADER_BG,
      titleMarginBottom: 8,
      itemPaddingBottom: 8,
    },

    Segmented: {
      itemSelectedBg: '#ffffff',
      trackPadding: 2,
    },

    Tag: {
      defaultBg: HEADER_BG,
      borderRadiusSM: 2,
    },

    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      paddingInline: 10,
    },

    Tooltip: {
      borderRadius: 2,
    },

    Alert: {
      withDescriptionPadding: '10px 12px',
      defaultPadding: '6px 12px',
    },

    Empty: {
      controlHeightLG: 32,
    },
  },
}
