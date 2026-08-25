import type { Photo, WorkItem } from '@/types'

/**
 * 작업 항목 한 줄을 다루는 공용 함수.
 *
 * 사진대지 양식은 사진마다 줄과 규격·수량 칸을 미리 깔아두므로 빈 줄과 빈 칸이 섞인다.
 * 저장·집계·내보내기가 같은 기준으로 걸러내야 화면과 결과물이 어긋나지 않아서 여기 모은다.
 */

/** 값이 있는 규격·수량 쌍만 */
export function filledEntries(item: WorkItem) {
  return item.entries.filter((entry) => entry.spec || entry.quantity != null)
}

/**
 * 한 칸이라도 값이 있는 줄.
 * 수량만 적어둔 줄도 남긴다 — 사람이 적은 값을 임의로 버리지 않는다.
 */
export function hasContent(item: WorkItem): boolean {
  return Boolean(item.category) || filledEntries(item).length > 0
}

/** 줄 하나의 수량 합. 같은 구분에 규격이 여럿이면 모두 더한다 */
export function totalQuantity(item: WorkItem): number {
  return item.entries.reduce((sum, entry) => sum + (entry.quantity ?? 0), 0)
}

/** 확인이 필요한 칸 수 — 줄 단위 표시와 칸 단위 표시를 함께 센다 */
export function uncertainCount(item: WorkItem): number {
  const own = item.uncertain ? Object.keys(item.uncertain).length : 0
  return item.entries.reduce(
    (sum, entry) => sum + (entry.uncertain ? Object.keys(entry.uncertain).length : 0),
    own,
  )
}

/** 사진 한 장에서 확인이 필요한 칸 수. 0이면 사람이 볼 것 없이 검수 완료해도 된다 */
export function photoUncertainCount(photo: Photo): number {
  const own = photo.uncertain ? Object.keys(photo.uncertain).length : 0
  return photo.workItems.reduce((sum, item) => sum + uncertainCount(item), own)
}

/**
 * 검수 완료를 막는 이유. 없으면 null — 그대로 확정할 수 있다.
 *
 * **확정된 사진만 집계와 내보내기에 들어간다.** 그래서 이 판정 하나가 곧
 * '이 사진이 실적이 되는가'다. 분석 직후 자동 확정, 사진대지의 확인 필요 필터,
 * 검수 완료 체크박스 잠금이 모두 이 함수를 쓴다 — 세 곳의 기준이 어긋나면
 * 사람 눈에는 멀쩡한 사진이 집계에서만 조용히 빠지는 일이 생긴다.
 */
export function confirmBlocker(photo: Photo): string | null {
  // 서버가 확정을 받아주지 않는 조건과 같아야 한다. 어긋나면 반영에서 400이 돌아온다
  if (photo.status === 'uploading' || photo.status === 'analyzing') {
    return '분석이 끝나면 검수할 수 있습니다'
  }
  if (photo.status === 'failed' && !photo.workItems.some(hasContent)) {
    return '분석에 실패했습니다. 작업 항목을 직접 채우거나 사진을 지워주세요'
  }
  const uncertain = photoUncertainCount(photo)
  if (uncertain > 0) return `확인이 필요한 칸 ${uncertain}개를 먼저 채워주세요`
  // 작업일이 없으면 집계가 어느 열에도 못 넣는다. 확정 전에 받아둔다
  if (!photo.workDate) return '작업일을 채워주세요'
  return null
}

/**
 * 사람이 봐야 하는 사진 — 지금 이대로는 반영할 수 없는 사진.
 *
 * 서버도 같은 뜻의 `needsReview`를 사진마다 들고 온다.
 * 붙일 때 이 함수는 그 값을 읽는 자리로 바뀐다 — 판정 자체가 서버 몫이기 때문이다.
 */
export function needsReview(photo: Photo): boolean {
  return confirmBlocker(photo) !== null
}

/**
 * 규격·수량 쌍이 양식의 칸 수를 넘으면 줄을 나눈다.
 *
 * 원본 엑셀 사진대지 양식이 한 줄에 두 쌍까지만 갖고 있어 칸을 옆으로 늘릴 수 없다.
 * 그래서 넘치는 쌍은 같은 구분을 단 줄을 하나 더 만들어 아래로 흘린다.
 * 화면과 내보내기가 모두 이 함수를 거쳐야 둘의 줄 수가 같아진다.
 */
export function splitToFormRows(item: WorkItem, slots: number): WorkItem[] {
  if (item.entries.length <= slots) return [item]

  const rows: WorkItem[] = []
  for (let start = 0; start < item.entries.length; start += slots) {
    rows.push({
      ...item,
      // 첫 줄만 원래 id를 쓴다. 나머지는 편집·삭제가 서로 섞이지 않게 따로 붙인다
      id: start === 0 ? item.id : `${item.id}__over${start / slots}`,
      entries: item.entries.slice(start, start + slots),
    })
  }
  return rows
}
