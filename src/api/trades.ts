import { trades } from '@/mocks/trades'
import { delay } from '@/mocks/delay'
import type { Trade } from '@/types'

/**
 * 공종 — 사진대지의 `구 분`이자 집계 품목의 뿌리.
 *
 * 프로젝트마다 다르다. 사진대지는 이 목록에서 골라 넣는다.
 * 규격은 등록하지 않는다 — 사진마다 AI가 읽고, 집계 행은 서버가 갈라서 만든다.
 */
export function getTrades(projectId: string): Promise<Trade[]> {
  return delay(trades.filter((trade) => trade.projectId === projectId).map((t) => ({ ...t })))
}

/** 공종을 만든다. 같은 프로젝트 안에서 이름이 겹치면 서버가 409로 거른다 */
export function addTrade(projectId: string, name = ''): Promise<Trade> {
  const trade: Trade = { id: `td${Date.now()}`, projectId, name }
  trades.push(trade)
  return delay({ ...trade }, 200)
}

export function saveTrade(trade: Trade): Promise<Trade> {
  const found = trades.find((candidate) => candidate.id === trade.id)
  if (!found) throw new Error('공종을 찾을 수 없습니다')

  Object.assign(found, trade)
  return delay({ ...found }, 300)
}

export function removeTrade(id: string): Promise<void> {
  const index = trades.findIndex((trade) => trade.id === id)
  if (index >= 0) trades.splice(index, 1)
  return delay(undefined, 200)
}
