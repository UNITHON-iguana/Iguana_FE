import { api } from '@/lib/api'

/**
 * 집계표 한 행.
 *
 * 서버가 만든다. 행 하나는 공종 하나이거나 `공종 + 규격` 하나다.
 */
export interface AggregationRow {
  workTypeId: number
  workTypeName: string
  /** 규격. 둘레 연장으로 환산한 행은 규격을 가리지 않으므로 null */
  spec: string | null
  unit: string
  /** 날짜 → 수량. 값이 없는 날은 키가 없다 */
  quantityByDate: Record<string, number>
  /** 이 행의 누계 */
  total: number
}

export interface Aggregation {
  /** 작업일 오름차순 */
  dates: string[]
  rows: AggregationRow[]
  /** 날짜별 전체 공종 합계 */
  totalByDate: Record<string, number>
  grandTotal: number
}

/**
 * 집계표·누계 데이터 — `GET /api/v1/projects/{id}/aggregation`.
 *
 * **확정된 사진만 센다.** 날짜를 주면 그날치만, 생략하면 전체를 집계한다.
 *
 * **계산은 전부 서버가 한다.** 규격을 갈라 행을 만드는 것도, 가로*세로를 둘레 연장으로
 * 환산하는 것도, 단위를 정하는 것도 서버 몫이다(`docs/집계-규칙.md`).
 * 프론트는 받은 표에서 날짜 열을 고른 달로 좁히거나 월로 접기만 한다
 * (`SummaryPage`의 `reshape`).
 *
 * 화면은 늘 날짜 없이 전체를 받는다 — 집계표는 한 달치만 보지만 기성누계가 전체를
 * 필요로 해서, 두 탭이 같은 응답을 나눠 쓰는 편이 호출 한 번으로 끝난다.
 */
export function getAggregation(projectId: string, date?: string): Promise<Aggregation> {
  const query = date ? `?date=${date}` : ''
  return api.get<Aggregation>(`/api/v1/projects/${projectId}/aggregation${query}`)
}
