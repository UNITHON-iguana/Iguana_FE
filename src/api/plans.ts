import { planMaterialItems, planWorkItems } from '@/mocks/db'
import { delay } from '@/mocks/delay'
import type { PlanMaterialItem, PlanWorkItem } from '@/types'

/**
 * 계획 데이터.
 *
 * 엑셀 업로드로 받지 않고 화면에서 직접 입력한다.
 * 현장·발주처마다 계획 양식이 제각각이라, 파일을 읽어 맞추는 것보다
 * 필요한 줄을 직접 넣는 편이 빠르다.
 */

export function getPlanWorkItems(projectId: string): Promise<PlanWorkItem[]> {
  return delay(planWorkItems.filter((item) => item.projectId === projectId).map((i) => ({ ...i })))
}

export function getPlanMaterialItems(projectId: string): Promise<PlanMaterialItem[]> {
  return delay(
    planMaterialItems.filter((item) => item.projectId === projectId).map((i) => ({ ...i })),
  )
}

/** 빈 줄 하나를 만든다. 값은 사람이 채운다 */
export function addPlanWorkItem(projectId: string): Promise<PlanWorkItem> {
  const item: PlanWorkItem = {
    id: `pw${Date.now()}`,
    projectId,
    location: '',
    workType: '',
    description: '',
    quantity: null,
    unit: null,
  }
  planWorkItems.push(item)
  return delay({ ...item }, 200)
}

export function addPlanMaterialItem(projectId: string): Promise<PlanMaterialItem> {
  const item: PlanMaterialItem = {
    id: `pm${Date.now()}`,
    projectId,
    location: '',
    workType: '',
    material: '',
    quantity: null,
    unit: null,
  }
  planMaterialItems.push(item)
  return delay({ ...item }, 200)
}

export function savePlanWorkItem(item: PlanWorkItem): Promise<PlanWorkItem> {
  const found = planWorkItems.find((candidate) => candidate.id === item.id)
  if (!found) throw new Error('계획 공정을 찾을 수 없습니다')

  Object.assign(found, item)
  return delay({ ...found }, 300)
}

export function savePlanMaterialItem(item: PlanMaterialItem): Promise<PlanMaterialItem> {
  const found = planMaterialItems.find((candidate) => candidate.id === item.id)
  if (!found) throw new Error('계획 자재를 찾을 수 없습니다')

  Object.assign(found, item)
  return delay({ ...found }, 300)
}

export function removePlanWorkItem(id: string): Promise<void> {
  const index = planWorkItems.findIndex((item) => item.id === id)
  if (index >= 0) planWorkItems.splice(index, 1)
  return delay(undefined, 200)
}

export function removePlanMaterialItem(id: string): Promise<void> {
  const index = planMaterialItems.findIndex((item) => item.id === id)
  if (index >= 0) planMaterialItems.splice(index, 1)
  return delay(undefined, 200)
}
