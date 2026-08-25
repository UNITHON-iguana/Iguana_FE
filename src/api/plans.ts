import { api } from '@/lib/api'
import type { PlanWorkItem } from '@/types'

/**
 * 계획 공정 — 위치·공종·작업내용마다 목표 물량을 적어두는 표.
 *
 * 계획 대비 현황이 이 표를 기준으로 삼는다. 엑셀 업로드는 받지 않는다 —
 * 계획 양식이 현장·발주처마다 제각각이라 필요한 줄을 표에서 직접 넣는 편이 빠르다.
 *
 * **자재 계획은 두지 않는다.** 서버가 자재 실적을 따로 재지 않아 비교가 성립하지 않는다.
 */

interface PlanProcessResponse {
  id: number
  workTypeId: number
  workTypeName: string
  location: string
  workDetail: string
  plannedQuantity: number | null
  unit: string | null
}

/** 서버가 한 줄을 만들거나 고칠 때 받는 모양. 부분 수정은 없고 전체를 교체한다 */
interface PlanProcessRequest {
  workTypeId: number
  location: string
  workDetail: string
  plannedQuantity: number | null
  unit: string | null
}

function path(projectId: string): string {
  return `/api/v1/projects/${projectId}/plans/process`
}

function toPlanWorkItem(res: PlanProcessResponse): PlanWorkItem {
  return {
    id: String(res.id),
    location: res.location,
    workTypeId: res.workTypeId,
    workType: res.workTypeName,
    description: res.workDetail,
    quantity: res.plannedQuantity,
    unit: res.unit,
  }
}

/**
 * 저장할 모양으로 옮긴다.
 *
 * 공종은 서버가 id로만 받는다 — 아직 안 고른 줄은 보낼 수 없어 부르는 쪽이 먼저 막는다.
 * 빈 글자 칸은 그대로 보낸다. 사람이 지운 값을 임의로 되살리지 않는다.
 */
function toRequest(item: PlanWorkItem): PlanProcessRequest {
  if (item.workTypeId == null) throw new Error('공종을 먼저 골라주세요')
  return {
    workTypeId: item.workTypeId,
    location: item.location,
    workDetail: item.description,
    plannedQuantity: item.quantity,
    unit: item.unit,
  }
}

export async function getPlanWorkItems(projectId: string): Promise<PlanWorkItem[]> {
  const list = await api.get<PlanProcessResponse[]>(path(projectId))
  return list.map(toPlanWorkItem)
}

/**
 * 줄 하나를 등록한다.
 *
 * **공종이 정해진 뒤에야 부를 수 있다.** 서버가 `workTypeId`를 필수로 받아서, 빈 줄을
 * 먼저 만들어두고 채워 넣는 순서가 성립하지 않는다. 그래서 `줄 추가`는 화면에만 줄을
 * 깔고, 사람이 공종을 고르는 순간 이 호출이 나간다(`PlanPage`의 `commit`).
 */
export async function addPlanWorkItem(
  projectId: string,
  item: PlanWorkItem,
): Promise<PlanWorkItem> {
  return toPlanWorkItem(await api.post<PlanProcessResponse>(path(projectId), toRequest(item)))
}

export async function savePlanWorkItem(
  projectId: string,
  item: PlanWorkItem,
): Promise<PlanWorkItem> {
  return toPlanWorkItem(
    await api.patch<PlanProcessResponse>(`${path(projectId)}/${item.id}`, toRequest(item)),
  )
}

export function removePlanWorkItem(projectId: string, id: string): Promise<void> {
  return api.delete<void>(`${path(projectId)}/${id}`)
}
