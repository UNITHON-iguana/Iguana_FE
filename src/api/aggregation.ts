import { delay } from '@/mocks/delay'
import { photos } from '@/mocks/db'
import { workTypes } from '@/mocks/workTypes'

/**
 * 집계표 한 행.
 *
 * 서버가 만든다. 행 하나는 공종 하나이거나 `공종 + 규격` 하나다.
 */
export interface AggregationRow {
  workTypeId: number
  workTypeName: string
  /** 규격. 둘레 연장으로 환산한 행은 규격을 가리지 않으므로 null */
  spec: string | null
  unit: string
  /** 날짜 → 수량. 값이 없는 날은 키가 없다 */
  quantityByDate: Record<string, number>
  /** 이 행의 누계 */
  total: number
}

export interface Aggregation {
  /** 작업일 오름차순 */
  dates: string[]
  rows: AggregationRow[]
  /** 날짜별 전체 공종 합계 */
  totalByDate: Record<string, number>
  grandTotal: number
}

/*
 * ─────────────────────────────────────────────────────────────
 * 아래는 목이 백엔드 규칙을 흉내 내는 부분이다.
 * 백엔드가 붙으면 `getAggregation`이 fetch 한 줄이 되고 전부 사라진다.
 * ─────────────────────────────────────────────────────────────
 */

/** 소수 수량을 거듭 더하면 꼬리가 남는다. 소수점 둘째 자리에서 자른다 */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** `2000*600` 같은 사각 단면 표기. 현장에서 `x`나 `×`도 섞어 쓴다 */
const SECTION = /^(\d+(?:\.\d+)?)[*xX×](\d+(?:\.\d+)?)$/

/**
 * 규격을 어떻게 셀지 정한다.
 *
 * 가로*세로로 들어오면 둘레 연장(m)으로 환산하고 규격은 접는다.
 * 그렇지 않으면 규격을 그대로 두고 공종 옆에 붙여 행을 가른다.
 */
function measure(spec: string | null, quantity: number) {
  const match = SECTION.exec((spec ?? '').replace(/\s/g, ''))
  // 단위도 여기서 갈린다 — 공종에 등록된 값이 아니라 규격 모양이 정한다
  if (!match) return { spec, quantity, unit: '개' }

  const perimeter = ((Number(match[1]) + Number(match[2])) * 2) / 1000
  return { spec: null, quantity: perimeter * quantity, unit: 'm' }
}

/**
 * 집계표·누계 데이터.
 *
 * **확정된 사진만 센다.** 날짜를 주면 그날치만, 생략하면 전체를 집계한다.
 * 규격을 가르는 것도 둘레로 환산하는 것도 서버가 한다 — 프론트는 받아서 그리기만 한다.
 */
export function getAggregation(projectId: string, date?: string): Promise<Aggregation> {
  const byWorkType = new Map(workTypes.map((workType) => [workType.name, workType]))
  const buckets = new Map<string, AggregationRow>()
  const dates = new Set<string>()

  const target = photos.filter(
    (photo) =>
      photo.projectId === projectId &&
      photo.reviewStatus === 'confirmed' &&
      photo.workDate &&
      (!date || photo.workDate === date),
  )

  for (const photo of target) {
    const workDate = photo.workDate!
    dates.add(workDate)

    for (const item of photo.workItems) {
      const workType = item.category ? byWorkType.get(item.category) : undefined
      // 등록되지 않은 공종은 서버가 세지 않는다
      if (!workType) continue

      for (const entry of item.entries) {
        if (!entry.spec && entry.quantity == null) continue

        const measured = measure(entry.spec, entry.quantity ?? 0)
        const key = `${workType.id}:${measured.spec ?? ''}`

        const row = buckets.get(key) ?? {
          workTypeId: workType.id,
          workTypeName: workType.name,
          spec: measured.spec,
          unit: measured.unit,
          quantityByDate: {},
          total: 0,
        }
        row.quantityByDate[workDate] = (row.quantityByDate[workDate] ?? 0) + measured.quantity
        row.total += measured.quantity
        buckets.set(key, row)
      }
    }
  }

  const sortedDates = [...dates].sort()
  const order = workTypes.map((workType) => workType.id)
  const rows = [...buckets.values()]
    // 공종은 등록 순서대로, 같은 공종 안에서는 규격 순으로
    .sort(
      (a, b) =>
        order.indexOf(a.workTypeId) - order.indexOf(b.workTypeId) ||
        Number(a.spec ?? 0) - Number(b.spec ?? 0),
    )
    .map((row) => ({
      ...row,
      total: round(row.total),
      quantityByDate: Object.fromEntries(
        Object.entries(row.quantityByDate).map(([day, value]) => [day, round(value)]),
      ),
    }))

  const totalByDate: Record<string, number> = {}
  for (const day of sortedDates) {
    totalByDate[day] = round(rows.reduce((sum, row) => sum + (row.quantityByDate[day] ?? 0), 0))
  }

  return delay({
    dates: sortedDates,
    rows,
    totalByDate,
    grandTotal: round(rows.reduce((sum, row) => sum + row.total, 0)),
  })
}
