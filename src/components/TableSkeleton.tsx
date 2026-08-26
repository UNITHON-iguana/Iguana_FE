import { theme } from 'antd'

/** 줄마다 길이를 달리해 글자가 들어찰 자리처럼 보이게 한다 */
const BAR_WIDTHS = ['38%', '62%', '46%', '55%', '33%', '58%']

export interface TableSkeletonProps {
  /** 몇 줄을 깔아둘지. 곧 올 표의 길이에 맞춘다 */
  rows?: number
}

/**
 * 표가 오기 전에 자리를 지키는 회색 줄.
 *
 * **비어 있는 것과 아직 안 온 것은 다르다.** 불러오는 동안 `등록된 프로젝트가 없습니다`를
 * 띄우면 사람은 없는 줄 알고 화면을 떠나거나, 있을 리 없는 것을 만들려 든다.
 * 그렇다고 아무것도 안 그리면 화면이 잠깐 텅 비어 무엇이 잘못된 것처럼 보인다.
 *
 * 격자를 그대로 흉내 내 곧 표가 설 자리임을 알린다. **깜빡이지 않는다** —
 * 이 화면은 연출된 모션을 쓰지 않고, 하루 종일 보는 업무 화면에서 움직이는 회색 띠는
 * 눈을 끌기만 한다.
 */
export function TableSkeleton({ rows = 4 }: TableSkeletonProps) {
  const { token } = theme.useToken()

  return (
    <div role="status" aria-label="불러오는 중입니다" style={{ width: '100%' }}>
      {Array.from({ length: rows }, (_, index) => BAR_WIDTHS[index % BAR_WIDTHS.length]).map(
        (width, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 28,
              paddingInline: 8,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div
              style={{
                width,
                height: 8,
                borderRadius: 2,
                backgroundColor: token.colorFillSecondary,
              }}
            />
          </div>
        ),
      )}
    </div>
  )
}
