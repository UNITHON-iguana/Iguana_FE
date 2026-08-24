import type { ThemeConfig } from 'antd'

/**
 * 디자인 토큰 — 색·간격·타이포는 전부 여기서 파생시킨다.
 * 컴포넌트에서 색상 리터럴을 직접 쓰지 말고 `theme.useToken()`으로 읽는다.
 *
 * 방향: 엑셀처럼 보이게 한다.
 * 격자가 주인공이고, 모서리는 각지고, 밀도는 높다.
 * 색은 회색 계열이 기본이고 녹색은 주요 액션에만 쓴다.
 */

const FONT_STACK = [
  "'Pretendard Variable'",
  'Pretendard',
  '-apple-system',
  'BlinkMacSystemFont',
  "'Malgun Gothic'",
  'sans-serif',
].join(', ')

/** 주요 액션에만 쓰는 녹색 */
const GREEN = '#217346'

/** 격자선 — 화면의 뼈대라 다른 색보다 먼저 정한다 */
const GRID_LINE = '#d4d8dd'
const GRID_LINE_SOFT = '#e6e9ec'

/** 표 머리글과 라벨 칸 배경 */
const HEADER_BG = '#f0f2f4'

export const theme: ThemeConfig = {
  // 토큰을 CSS 변수(--ant-*)로 내보낸다. 인쇄용 CSS에서도 같은 값을 참조할 수 있다.
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
  },
}
