import { planMaterialItems, planWorkItems, photos } from '@/mocks/db'
import { delay } from '@/mocks/delay'
import type { CompareStatus, MaterialComparisonRow, WorkComparisonRow } from '@/types'

function statusOf(planned: number | null, actual: number | null): CompareStatus {
  // 계획 또는 실적이 없으면 추정하지 않고 비교 데이터 부족으로 둔다
  if (planned == null || actual == null) return 'insufficient'
  if (actual > planned) return 'over'
  if (actual < planned) return 'under'
  return 'match'
}

/** 검수 완료된 사진의 작업 항목만 실적으로 집계한다 */
function confirmedWorkItems(projectId: string) {
  return photos
    .filter((p) => p.projectId === projectId && p.reviewStatus === 'confirmed')
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
        ? matched.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
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
        ? matched.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
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
