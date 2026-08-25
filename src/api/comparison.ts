import { api } from '@/lib/api'
import type { CompareStatus, ComparisonRow } from '@/types'

/**
 * 계획 대비 현황 — 계획 공정과 확정된 실적을 견준다.
 *
 * **공종 단위다.** 계획은 위치·작업내용까지 적지만 실적은 공종까지만 되짚을 수 있어
 * 서버가 공종으로 합쳐서 준다.
 *
 * **확정된 사진만 실적으로 센다.** 집계·엑셀과 같은 기준이다 —
 * 세 곳이 어긋나면 어느 숫자를 믿을지 알 수 없다.
 *
 * **자재 비교는 부르지 않는다.** 서버에 자리는 있지만 실적 자리에 자재량이 아니라
 * 확정된 작업 수량이 들어간다. 계획 자재(EA)와 시공 물량(개소)을 나눈 비율이라
 * 숫자는 나오지만 뜻이 없다.
 */

interface ComparisonItemResponse {
  workTypeId: number
  workTypeName: string
  unit: string | null
  plannedQuantity: number
  actualQuantity: number
  achievementRate: number
}

/**
 * 계획과 실적을 견준 결과.
 *
 * 서버는 달성률만 주고 판정은 하지 않는다. 계획이 없는 공종은 견줄 것이 없어
 * 초과라고 부르지 않는다 — 값이 없으면 추정하지 않는다.
 */
function statusOf(planned: number, actual: number): CompareStatus {
  if (planned === 0) return 'insufficient'
  if (actual > planned) return 'over'
  if (actual < planned) return 'under'
  return 'match'
}

export async function getWorkComparison(projectId: string): Promise<ComparisonRow[]> {
  const list = await api.get<ComparisonItemResponse[]>(
    `/api/v1/projects/${projectId}/comparison/process`,
  )
  return list.map((row) => ({ ...row, status: statusOf(row.plannedQuantity, row.actualQuantity) }))
}
