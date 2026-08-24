import { planMaterialItems, planWorkItems } from '@/mocks/db'
import { delay } from '@/mocks/delay'
import type { PlanMaterialItem, PlanWorkItem } from '@/types'

export function getPlanWorkItems(projectId: string): Promise<PlanWorkItem[]> {
  return delay(planWorkItems.filter((item) => item.projectId === projectId))
}

export function getPlanMaterialItems(projectId: string): Promise<PlanMaterialItem[]> {
  return delay(planMaterialItems.filter((item) => item.projectId === projectId))
}

/** 엑셀 파싱 결과 한 행의 검증 실패 정보 */
export interface RowError {
  row: number
  message: string
}

export interface PlanUploadResult {
  addedWorkItems: number
  addedMaterialItems: number
  errors: RowError[]
}

/**
 * 계획 데이터 엑셀 업로드.
 * 실제 파싱과 행 단위 검증은 백엔드 스펙이 정해진 뒤 붙인다.
 */
export function uploadPlanExcel(projectId: string, file: File): Promise<PlanUploadResult> {
  void projectId
  void file
  return delay({ addedWorkItems: 0, addedMaterialItems: 0, errors: [] }, 800)
}
