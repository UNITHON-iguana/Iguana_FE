import { hasContent } from '@/lib/workItems'
import type { AggregateItem, AggregateUnit, Photo } from '@/types'

/**
 * 집계 엔진.
 *
 * 원본 엑셀(BS.xlsm)의 단계를 그대로 옮긴다.
 *
 *   사진대지 원장 → 품목×작업일 1차 집계 → HB 가공 → 기성 누계
 *
 * 공종에 따라 세는 방식이 다르다.
 * 배관류는 `구분 + 호칭경`이 한 품목이고 개소(EA)를 그대로 센다.
 * 덕트류는 `구분` 하나가 한 품목이고, 규격의 `가로*세로`에서 둘레를 뽑아
 * 연장 길이(m)로 환산한다.
 *
 * **이 차이를 여기서 추측하지 않는다.** 품목 마스터(`AggregateItem`)가 단위와 계수를
 * 들고 오고, 이 파일은 시킨 대로 환산하고 묶기만 한다. 새 공종이 생겨도 코드는 그대로다.
 */

/**
 * 소수 수량을 거듭 더하면 0.1 + 0.2 = 0.30000000000000004 처럼 꼬리가 남는다.
 * 화면에 내보내기 전에 자른다 — 현장 물량은 소수점 둘째 자리면 충분하다.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** `600*400` 같은 사각 단면 표기. 현장에서 `x`나 `×`도 섞어 쓴다 */
const SECTION = /^(\d+(?:\.\d+)?)[*xX×](\d+(?:\.\d+)?)$/

/** 비교·매칭 전에 공백을 없앤다 — 사람이 친 값이라 `1300 * 800`처럼 들어온다 */
function squeeze(value: string | null): string {
  return (value ?? '').replace(/\s/g, '')
}

/** 사각 단면 규격을 가로·세로로 가른다. 단면 표기가 아니면 null */
export function parseSection(spec: string | null): { width: number; height: number } | null {
  const match = SECTION.exec(squeeze(spec))
  if (!match) return null
  return { width: Number(match[1]), height: Number(match[2]) }
}

/** 사각 덕트 둘레(m). 원본 수식 `(가로+세로)*2/1000` 그대로다 */
export function perimeterMeters(width: number, height: number): number {
  return ((width + height) * 2) / 1000
}

/**
 * 사진대지 한 줄을 품목 마스터에 붙인다.
 * 규격까지 맞는 품목을 먼저 찾고, 없으면 규격을 가리지 않는 품목(덕트류)에 붙인다.
 */
function findItem(items: AggregateItem[], category: string | null, spec: string | null) {
  const wanted = squeeze(category)
  if (!wanted) return undefined

  const sameCategory = items.filter((item) => squeeze(item.category) === wanted)
  const exact = sameCategory.find(
    (item) => item.spec !== null && squeeze(item.spec) === squeeze(spec),
  )
  return exact ?? sameCategory.find((item) => item.spec === null)
}

/** 품목의 집계 단위로 환산한 값. 환산할 수 없으면 null */
function measure(item: AggregateItem, spec: string | null, quantity: number): number | null {
  if (item.unit === 'EA') return quantity

  const section = parseSection(spec)
  // m로 세는 품목인데 단면을 못 읽으면 길이를 지어내지 않는다
  if (!section) return null
  return perimeterMeters(section.width, section.height) * quantity
}

/** 집계표 한 행 */
export interface PivotRow {
  key: string
  label: string
  unit: AggregateUnit
  /** 열 이름 → 값. 값이 없는 칸은 키가 없다 */
  values: Record<string, number>
  total: number
}

export interface Pivot {
  /** 작업일 또는 월. 오름차순 */
  columns: string[]
  rows: PivotRow[]
  /** 열별 합계 */
  totals: Record<string, number>
  grandTotal: number
}

/** 어느 품목에도 붙지 않은 줄. 조용히 버리지 않고 화면에서 알린다 */
export interface UnmatchedRow {
  key: string
  photoSeq: number
  category: string | null
  spec: string | null
  quantity: number | null
  reason: string
}

export interface AggregateResult {
  pivot: Pivot
  unmatched: UnmatchedRow[]
  /** 작업일이 비어 어느 열에도 못 넣은 사진 */
  undatedPhotos: number
}

/**
 * 품목×열 1차 집계.
 *
 * `columnOf`가 작업일을 열 이름으로 바꾼다 — 그대로 두면 일자별,
 * `YYYY-MM`으로 자르면 월별이 된다. 두 화면이 같은 엔진을 쓴다.
 */
export function aggregate(
  items: AggregateItem[],
  photos: Photo[],
  columnOf: (workDate: string) => string,
): AggregateResult {
  const values = new Map<string, Record<string, number>>()
  const columns = new Set<string>()
  const unmatched: UnmatchedRow[] = []
  let undatedPhotos = 0

  for (const photo of photos) {
    if (!photo.workDate) {
      // 채운 값이 있는 사진만 센다. 빈 사진은 빠져도 줄어드는 물량이 없어 알릴 것이 없다
      if (photo.workItems.some(hasContent)) undatedPhotos += 1
      continue
    }
    const column = columnOf(photo.workDate)
    columns.add(column)

    for (const workItem of photo.workItems) {
      for (const [slot, entry] of workItem.entries.entries()) {
        // 양식을 채우려고 남겨둔 빈 칸은 집계 대상이 아니다
        if (!entry.spec && entry.quantity == null) continue

        const key = `${photo.id}:${workItem.id}:${slot}`
        const item = findItem(items, workItem.category, entry.spec)

        if (!item) {
          unmatched.push({
            key,
            photoSeq: photo.seq,
            category: workItem.category,
            spec: entry.spec,
            quantity: entry.quantity,
            reason: '품목 마스터에 없는 구분입니다',
          })
          continue
        }

        const measured = measure(item, entry.spec, entry.quantity ?? 0)
        if (measured == null) {
          unmatched.push({
            key,
            photoSeq: photo.seq,
            category: workItem.category,
            spec: entry.spec,
            quantity: entry.quantity,
            reason: '연장 길이로 세는 품목인데 규격이 가로*세로가 아닙니다',
          })
          continue
        }

        const row = values.get(item.id) ?? {}
        row[column] = (row[column] ?? 0) + measured
        values.set(item.id, row)
      }
    }
  }

  return {
    pivot: buildPivot(
      [...columns].sort(),
      // 값이 없는 품목도 행은 남긴다 — 기성 양식의 행 목록은 고정이다
      items.map((item) => ({
        key: item.id,
        label: item.name,
        unit: item.unit,
        raw: values.get(item.id) ?? {},
      })),
    ),
    unmatched,
    undatedPhotos,
  }
}

/** 행 재료를 받아 합계까지 채운 표로 만든다 */
function buildPivot(
  columns: string[],
  seeds: { key: string; label: string; unit: AggregateUnit; raw: Record<string, number> }[],
): Pivot {
  const totals: Record<string, number> = {}
  let grandTotal = 0

  const rows = seeds.map((seed) => {
    const values: Record<string, number> = {}
    let total = 0

    for (const column of columns) {
      const value = seed.raw[column]
      if (value == null) continue
      values[column] = round(value)
      total += value
      totals[column] = (totals[column] ?? 0) + value
    }

    grandTotal += total
    return { key: seed.key, label: seed.label, unit: seed.unit, values, total: round(total) }
  })

  for (const column of columns) totals[column] = round(totals[column] ?? 0)
  return { columns, rows, totals, grandTotal: round(grandTotal) }
}

/**
 * 1차 집계를 그룹으로 묶는다.
 *
 * `weighted`를 켜면 품목마다 HB 계수를 곱한다 — 벽체 양면 시공(x2)이 여기서 붙는다.
 * 그룹 순서는 품목 마스터에서 처음 나온 순서를 따른다.
 */
export function groupBy(
  base: Pivot,
  items: AggregateItem[],
  groupOf: (item: AggregateItem) => string,
  weighted = false,
): Pivot {
  const byId = new Map(items.map((item) => [item.id, item]))
  const order: string[] = []
  const seeds = new Map<string, { unit: AggregateUnit; raw: Record<string, number> }>()

  for (const row of base.rows) {
    const item = byId.get(row.key)
    if (!item) continue

    const group = groupOf(item)
    let seed = seeds.get(group)
    if (!seed) {
      order.push(group)
      seed = { unit: item.unit, raw: {} }
      seeds.set(group, seed)
    }

    const factor = weighted ? item.multiplier : 1
    for (const [column, value] of Object.entries(row.values)) {
      seed.raw[column] = (seed.raw[column] ?? 0) + value * factor
    }
  }

  return buildPivot(
    base.columns,
    order.map((group) => {
      const seed = seeds.get(group)!
      return { key: group, label: group, unit: seed.unit, raw: seed.raw }
    }),
  )
}

/** 값이 하나도 없는 행을 뺀다 — 화면에서 훑어볼 때만 쓴다 */
export function withoutEmptyRows(pivot: Pivot): Pivot {
  return { ...pivot, rows: pivot.rows.filter((row) => row.total !== 0) }
}
