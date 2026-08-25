import { aggregateItems } from '@/mocks/aggregateItems'
import { delay } from '@/mocks/delay'
import type { AggregateItem } from '@/types'

/**
 * 집계 품목 마스터.
 *
 * 집계표의 행 목록·순서·집계 단위·HB 계수·롤업 그룹이 전부 여기서 온다.
 * 현장과 발주처마다 다른 업무 규칙이라 프론트가 정하지 않는다 —
 * 화면은 이 목록이 시킨 대로 행을 깔고, 묶고, 곱하기만 한다.
 */
export function getAggregateItems(projectId: string): Promise<AggregateItem[]> {
  void projectId
  return delay(aggregateItems)
}
