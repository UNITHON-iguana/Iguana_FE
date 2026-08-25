import { planMaterialItems, planWorkItems, photos } from '@/mocks/db'
import { delay } from '@/mocks/delay'
import { needsReview, totalQuantity } from '@/lib/workItems'
import type { CompareStatus, MaterialComparisonRow, WorkComparisonRow } from '@/types'

function statusOf(planned: number | null, actual: number | null): CompareStatus {
  // 계획 또는 실적이 없으면 추정하지 않고 비교 데이터 부족으로 둔다
  if (planned == null || actual == null) return 'insufficient'
  if (actual > planned) return 'over'
  if (actual < planned) return 'under'
  return 'match'
}

/**
 * 확인할 칸이 남지 않은 사진의 작업 항목만 실적으로 센다.
 * 집계·엑셀과 같은 기준이다 — 세 곳이 어긋나면 어느 숫자를 믿을지 알 수 없다.
 */
function confirmedWorkItems(projectId: string) {
  return photos
    .filter((p) => p.projectId === projectId && !needsReview(p))
    .flatMap((p) => p.workItems.map((item) => ({ ...item, location: p.location })))
}

export function getWorkComparison(projectId: string): Promise<WorkComparisonRow[]> {
  const actuals = confirmedWorkItems(projectId)

  const rows = planWorkItems
    .filter((plan) => plan.projectId === projectId)
    .map<WorkComparisonRow>((plan) => {
      const matched = actuals.filter(
        (item) => item.location === plan.location && item.category === plan.description,
      )
      const actual = matched.length
        ? matched.reduce((sum, item) => sum + totalQuantity(item), 0)
        : null

      return {
        key: plan.id,
        location: plan.location,
        workType: plan.workType,
        description: plan.description,
        plannedQuantity: plan.quantity,
        actualQuantity: actual,
        unit: plan.unit,
        status: statusOf(plan.quantity, actual),
      }
    })

  return delay(rows)
}

export function getMaterialComparison(projectId: string): Promise<MaterialComparisonRow[]> {
  const actuals = confirmedWorkItems(projectId)

  const rows = planMaterialItems
    .filter((plan) => plan.projectId === projectId)
    .map<MaterialComparisonRow>((plan) => {
      const matched = actuals.filter(
        (item) => item.location === plan.location && item.category === plan.material,
      )
      const actual = matched.length
        ? matched.reduce((sum, item) => sum + totalQuantity(item), 0)
        : null

      return {
        key: plan.id,
        location: plan.location,
        workType: plan.workType,
        material: plan.material,
        plannedQuantity: plan.quantity,
        actualQuantity: actual,
        unit: plan.unit,
        status: statusOf(plan.quantity, actual),
      }
    })

  return delay(rows)
}
