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

/**
 * 이 줄을 아직 보낼 수 없는 이유. 없으면 null — 그대로 등록하거나 고칠 수 있다.
 *
 * **서버가 400을 내는 조건과 같아야 한다.** 어긋나면 저장이 서버에서 되돌아온다.
 * `toRequest` 바로 옆에 두는 이유가 그것이다 — 보내는 모양과 보낼 수 있는 조건이
 * 떨어져 있으면 한쪽만 고쳐진다.
 *
 * 서버 스펙(`PlanProcessCreateRequest`)이 다섯 칸을 전부 필수로 받고, 등록(POST)과
 * 수정(PATCH)이 같은 모양을 쓴다. 그래서 이 판정은 새 줄에도 이미 등록된 줄에도 똑같이
 * 걸린다 — 등록된 줄에서 위치를 지우면 그 수정도 400이다.
 */
export function planRowBlocker(item: PlanWorkItem): string | null {
  if (item.workTypeId == null) return '공종을 골라주세요'
  if (!item.location.trim()) return '위치를 채워주세요'
  if (!item.description.trim()) return '작업내용을 채워주세요'
  if (item.quantity == null) return '계획 수량을 채워주세요'
  // 서버가 음수를 받지 않는다(`minimum: 0`)
  if (item.quantity < 0) return '계획 수량은 0보다 작을 수 없습니다'
  if (!item.unit?.trim()) return '단위를 채워주세요'
  return null
}

export async function getPlanWorkItems(projectId: string): Promise<PlanWorkItem[]> {
  const list = await api.get<PlanProcessResponse[]>(path(projectId))
  return list.map(toPlanWorkItem)
}

/**
 * 줄 하나를 등록한다.
 *
 * **줄이 다 채워진 뒤에야 부를 수 있다.** 서버가 다섯 칸을 모두 필수로 받아서, 빈 줄을
 * 먼저 만들어두고 채워 넣는 순서가 성립하지 않는다. 그래서 `줄 추가`는 화면에만 줄을
 * 깔고, 칸이 다 차고 사람이 그 줄에서 손을 뗄 때 이 호출이 나간다(`PlanPage`의 `leave`).
 * 보내기 전에 `planRowBlocker`로 먼저 걸러야 400을 맞지 않는다.
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
