import type { Trade } from '@/types'

/*
 * 공종 목 데이터.
 *
 * 실제 현장 파일(BS.xlsm) `집계표` 시트에 나오는 공종을 옮겼다.
 * **규격은 없다** — 사진마다 AI가 읽고, 집계 행은 서버가 규격까지 갈라서 만든다.
 *
 * 백엔드가 붙으면 이 파일 대신 `GET /projects/{id}/worktypes`가 같은 모양을 돌려준다.
 */

let seq = 0

function trade(name: string): Trade {
  return { id: String(++seq + 100), projectId: 'p1', name }
}

export const trades: Trade[] = [
  trade('금속관입상차열'),
  trade('금속관입상'),
  trade('스파이럴입상'),
  trade('금속관벽체'),
  trade('스파이럴벽체'),
  trade('PVC입상'),
  trade('세대SP'),
  trade('PVC벽체'),
  trade('대구경추가차열입상'),
  trade('대구경추가차열벽체'),
  trade('실란트마감입상'),
  trade('실란트마감벽체'),
  trade('슬리브'),

  // 규격이 가로*세로로 들어오는 공종 — 서버가 둘레 연장(m)으로 환산한다
  trade('무보온덕트입상'),
  trade('보온덕트입상'),
  trade('무보온덕트벽체'),
  trade('보온덕트벽체'),
  trade('댐퍼팽창테이프'),
  trade('덕트마감'),
  trade('오픈구'),
  trade('차열재마감'),
]
