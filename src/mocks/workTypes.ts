import type { WorkType } from '@/types'

/*
 * 공종 목 데이터.
 *
 * 실제 현장 파일(BS.xlsm) `집계표` 시트에 나오는 공종을 옮겼다.
 * **규격은 없다** — 사진마다 AI가 읽고, 집계 행은 서버가 규격까지 갈라서 만든다.
 *
 * **공종 API는 이미 서버가 준다**(`src/api/workTypes.ts`). 이 파일은 아직 목으로 남은
 * 집계(`src/api/aggregation.ts`)가 이름으로 공종을 찾을 때만 쓴다.
 * 집계가 서버로 넘어가면 같이 사라진다.
 */

let seq = 0

function workType(name: string): WorkType {
  return { id: ++seq + 100, name }
}

export const workTypes: WorkType[] = [
  workType('금속관입상차열'),
  workType('금속관입상'),
  workType('스파이럴입상'),
  workType('금속관벽체'),
  workType('스파이럴벽체'),
  workType('PVC입상'),
  workType('세대SP'),
  workType('PVC벽체'),
  workType('대구경추가차열입상'),
  workType('대구경추가차열벽체'),
  workType('실란트마감입상'),
  workType('실란트마감벽체'),
  workType('슬리브'),

  // 규격이 가로*세로로 들어오는 공종 — 서버가 둘레 연장(m)으로 환산한다
  workType('무보온덕트입상'),
  workType('보온덕트입상'),
  workType('무보온덕트벽체'),
  workType('보온덕트벽체'),
  workType('댐퍼팽창테이프'),
  workType('덕트마감'),
  workType('오픈구'),
  workType('차열재마감'),
]
