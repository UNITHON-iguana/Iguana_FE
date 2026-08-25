import { api } from '@/lib/api'
import type { Trade } from '@/types'

/**
 * 공종 — 사진대지의 `구 분`이자 집계 품목의 뿌리.
 *
 * 프로젝트마다 다르다. 사진대지는 이 목록에서 골라 넣는다.
 * 규격은 등록하지 않는다 — 사진마다 AI가 읽고, 집계 행은 서버가 갈라서 만든다.
 *
 * 서버는 `unit`도 함께 돌려주지만 화면은 쓰지 않는다. 집계 단위는 규격 모양이
 * 정하기 때문이다 — `2000*600`이면 둘레 연장(m), 아니면 개(`docs/집계-규칙.md`).
 * 등록된 단위를 같이 보여주면 같은 공종이 화면마다 다른 단위로 보인다.
 *
 * **이름은 고치지 않는다.** 수정 API를 두지 않기로 했다 — 잘못 등록했으면 지우고 다시 만든다.
 */

function path(projectId: string): string {
  return `/api/v1/projects/${projectId}/worktypes`
}

export function getTrades(projectId: string): Promise<Trade[]> {
  return api.get<Trade[]>(path(projectId))
}

/** 공종 하나를 만든다. 같은 프로젝트 안에서 이름이 겹치면 서버가 409로 거른다 */
export function createTrade(projectId: string, name: string): Promise<Trade> {
  return api.post<Trade>(path(projectId), { name })
}

export interface BulkTradeResult {
  created: Trade[]
  /** 이미 있거나 요청 안에서 겹쳐 건너뛴 이름. 에러가 아니라 결과다 */
  skippedDuplicateNames: string[]
}

/**
 * 여러 공종을 한 번에 만든다 — 프로젝트를 만들 때 쓴다.
 *
 * 겹치는 이름은 에러 없이 건너뛰고 나머지만 등록된다.
 * 무엇이 빠졌는지는 `skippedDuplicateNames`가 알려주므로 화면이 그대로 옮겨 말한다.
 */
export function createTrades(projectId: string, names: string[]): Promise<BulkTradeResult> {
  return api.post<BulkTradeResult>(`${path(projectId)}/bulk`, {
    workTypes: names.map((name) => ({ name })),
  })
}

/**
 * 공종을 지운다.
 *
 * **서버는 참조를 보고 막아주지 않는다.** 이미 이 공종을 쓴 사진이 있는지는
 * 부르는 쪽이 확인해야 한다(`TradesPage`의 `inUse`).
 */
export function removeTrade(projectId: string, workTypeId: number): Promise<void> {
  return api.delete<void>(`${path(projectId)}/${workTypeId}`)
}
