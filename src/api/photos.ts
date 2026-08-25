import { confirmBlocker, hasContent, needsReview } from '@/lib/workItems'
import { photos } from '@/mocks/db'
import { delay } from '@/mocks/delay'
import { placeholderImage } from '@/mocks/placeholder'
import type { Photo } from '@/types'

/**
 * 프로젝트의 사진 전부.
 *
 * **집계 프로토타입만 쓴다.** 사진이 수백 장이면 이 호출은 성립하지 않는다 —
 * 집계가 서버로 옮겨가면 이 함수도 같이 사라진다(`docs/집계-규칙.md`).
 * 화면에 목록을 그릴 때는 `getPhotoPage`를 쓴다.
 */
export function getPhotos(projectId: string): Promise<Photo[]> {
  return delay(photos.filter((p) => p.projectId === projectId).map((p) => ({ ...p })))
}

/**
 * 작업일 필터.
 * `'all'`은 전체, `'undated'`는 작업일이 비어 있는 사진, 나머지는 `'YYYY-MM-DD'`.
 */
export type WorkDateFilter = 'all' | 'undated' | (string & {})

/**
 * 목록에 담을 사진.
 *
 * 화면이 두 탭으로 갈리고 이 값이 곧 그 탭이다.
 * `review`는 확인할 칸이 남아 손을 봐야 하는 사진, `sheet`는 손볼 것이 없는 사진대지다.
 * 두 쪽은 겹치지 않고, 둘을 합치면 분석이 끝난 사진 전부다.
 *
 * **`sheet` 쪽이 곧 실적이다.** AI가 다 맞춘 사진은 사람 승인 없이 그대로 집계에
 * 들어가고, 사람이 값을 고친 사진만 확정 API를 타고 서버에 올라간다.
 */
export type PhotoScope = 'review' | 'sheet'

export interface PhotoQuery {
  projectId: string
  workDate: WorkDateFilter
  scope: PhotoScope
  /** 1부터 */
  page: number
  size: number
}

/**
 * 진행 상황 카운트.
 *
 * **작업일 필터까지만 적용한다.** `scope`와 페이지는 무시한다 —
 * 탭 이름에 붙는 수라 '지금 보고 있는 30장'이 아니라 '이 날 전체가 얼마나 끝났나'를 말한다.
 */
export interface PhotoCounts {
  photos: number
  /** 아직 업로드·분석 중이라 표에 올릴 칸이 없는 사진 */
  inProgress: number
  failed: number
  /** 확인할 칸이 남아 검수 탭에 있는 사진 */
  needsReview: number
  /** 손볼 것이 없어 사진대지 탭에 있는 사진. 집계와 내보내기가 세는 것도 이것이다 */
  sheet: number
}

/** 작업일 선택지 한 줄. `workDate`가 null이면 작업일이 비어 있는 사진 */
export interface WorkDateOption {
  workDate: string | null
  photos: number
}

export interface PhotoPage {
  items: Photo[]
  /** 필터를 모두 적용한 뒤의 총 개수. 페이지네이션이 쓴다 */
  total: number
  page: number
  size: number
}

/** 목록과 상관없이 화면 틀이 먼저 알아야 하는 값 */
export interface PhotoSummary {
  counts: PhotoCounts
  workDates: WorkDateOption[]
}

/** 표에 올릴 수 있는 사진 — 분석이 끝났거나 실패한 것 */
function isSettled(photo: Photo): boolean {
  return photo.status === 'analyzed' || photo.status === 'failed'
}

function matchesWorkDate(photo: Photo, filter: WorkDateFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'undated') return !photo.workDate
  return photo.workDate === filter
}

/** 확인할 칸이 남았는지가 곧 탭이다 */
function inScope(photo: Photo, scope: PhotoScope): boolean {
  return scope === 'review' ? needsReview(photo) : !needsReview(photo)
}

/**
 * 화면 틀이 쓰는 값 — 탭에 붙는 수와 작업일 선택지.
 *
 * **목록과 따로 준다.** 손볼 사진이 있으면 검수 탭으로, 없으면 사진대지 탭으로 여는데,
 * 이 값이 목록에 딸려 오면 목록을 받아야 탭이 정해지고 탭이 정해져야 목록을 받는
 * 순환이 된다. 진행 상황을 물어보는 자리이기도 해서 분석 중에는 여기만 다시 부른다.
 */
export function getPhotoSummary(
  projectId: string,
  workDate: WorkDateFilter,
): Promise<PhotoSummary> {
  const all = photos.filter((p) => p.projectId === projectId)

  const byDate = new Map<string | null, number>()
  for (const photo of all) {
    byDate.set(photo.workDate, (byDate.get(photo.workDate) ?? 0) + 1)
  }
  const workDates: WorkDateOption[] = [...byDate.entries()]
    .map(([date, count]) => ({ workDate: date, photos: count }))
    // 최근 작업일이 위로. 작업일이 빈 것은 맨 아래에 둔다
    .sort((a, b) => (b.workDate ?? '').localeCompare(a.workDate ?? ''))

  const inDate = all.filter((photo) => matchesWorkDate(photo, workDate))
  const settled = inDate.filter(isSettled)

  const counts: PhotoCounts = {
    photos: inDate.length,
    inProgress: inDate.length - settled.length,
    failed: inDate.filter((p) => p.status === 'failed').length,
    needsReview: settled.filter((p) => inScope(p, 'review')).length,
    sheet: settled.filter((p) => inScope(p, 'sheet')).length,
  }

  return delay({ counts, workDates })
}

/**
 * 사진 목록 한 페이지.
 *
 * 하루에 수백 장이 올라오므로 목록은 잘라서 준다.
 * 지금은 목이라 전부 들고 있다가 자르지만, **자르는 일은 원래 서버 몫이다** —
 * 백엔드가 붙으면 이 함수 안쪽만 바뀌고 화면은 그대로다.
 */
export function getPhotoPage(query: PhotoQuery): Promise<PhotoPage> {
  const filtered = photos
    .filter((p) => p.projectId === query.projectId)
    .filter((p) => matchesWorkDate(p, query.workDate))
    .filter(isSettled)
    .filter((p) => inScope(p, query.scope))

  const start = (query.page - 1) * query.size

  return delay({
    items: filtered.slice(start, start + query.size).map((p) => ({ ...p })),
    total: filtered.length,
    page: query.page,
    size: query.size,
  })
}

export function getPhoto(photoId: string): Promise<Photo | undefined> {
  const found = photos.find((p) => p.id === photoId)
  return delay(found && { ...found })
}

/** 업로드 목록에 사진을 추가한다. 이 시점에는 아직 분석하지 않는다 */
export function addPhotos(projectId: string, files: File[]): Promise<Photo[]> {
  const nextSeq = photos.reduce((max, p) => Math.max(max, p.seq), 0) + 1
  const added = files.map((file, index) => {
    const seq = nextSeq + index
    const photo: Photo = {
      id: `ph${Date.now()}_${index}`,
      projectId,
      seq,
      fileName: file.name,
      originalUrl: placeholderImage(String(seq)),
      croppedUrl: null,
      status: 'uploading',
      failureReason: null,
      workDate: null,
      location: null,
      workItems: [],
      reviewStatus: 'pending',
    }
    photos.push(photo)
    return photo
  })

  // 업로드 완료까지 잠깐 걸리는 것처럼 보이게 한다
  added.forEach((photo, index) => {
    setTimeout(
      () => {
        photo.status = 'analyzing'
      },
      400 + index * 200,
    )
  })

  return delay(added.map((p) => ({ ...p })))
}

export function removePhoto(photoId: string): Promise<void> {
  const index = photos.findIndex((p) => p.id === photoId)
  if (index >= 0) photos.splice(index, 1)
  return delay(undefined)
}

/**
 * AI 분석을 실행한다.
 *
 * 프로토타입에서는 사진마다 시차를 두고 결과를 채워 넣어
 * 분석 중 → 완료 흐름이 화면에서 실제로 움직이게 한다.
 * 개별 사진 실패가 다른 사진 분석을 막지 않는다는 것도 여기서 드러난다.
 */
export function startAnalysis(projectId: string): Promise<void> {
  const targets = photos.filter((p) => p.projectId === projectId && p.status !== 'analyzed')

  targets.forEach((photo, index) => {
    photo.status = 'analyzing'
    // 재분석이면 이전 실패 사유를 지운다
    photo.failureReason = null
    setTimeout(
      () => {
        // 마지막 한 장은 분석에 실패하는 경우를 보여준다
        if (index > 0 && index === targets.length - 1) {
          photo.status = 'failed'
          photo.failureReason = '텍스트 영역을 찾지 못했습니다'
          photo.reviewStatus = 'pending'
          return
        }
        photo.status = 'analyzed'
        photo.croppedUrl = placeholderImage(String(photo.seq), '#e8e8e8')
        photo.workDate = '2026-08-24'
        photo.location = '리테일 4층'
        // 세 장에 한 장꼴로 AI가 수량을 못 읽는다. 나머지는 확인할 칸이 없어 바로 확정된다
        const unread = index % 3 === 1
        photo.workItems = [
          {
            id: `w${photo.id}_1`,
            category: '무보온덕트벽체',
            entries: [
              { spec: '2000*600', quantity: 0.5 },
              { spec: null, quantity: null },
            ],
          },
          {
            id: `w${photo.id}_2`,
            category: '차열재마감',
            // 수량을 못 읽은 칸은 확인 필요로 표시해 사진대지에서 노랗게 뜨게 한다
            entries: [
              unread
                ? {
                    spec: '2000*600',
                    quantity: null,
                    uncertain: { quantity: '수량을 읽지 못했습니다' },
                  }
                : { spec: '2000*600', quantity: 1 },
              { spec: null, quantity: null },
            ],
          },
        ]
        /*
         * 분석만으로는 확정되지 않는다 — 확정은 사람이 반영을 눌러야 일어난다.
         * 확인할 칸이 없는 사진도 마찬가지라, 그런 사진은 사진대지 탭에 반영 대기로 쌓인다.
         */
        photo.reviewStatus = 'pending'
      },
      1500 + index * 1200,
    )
  })

  return delay(undefined, 200)
}

/**
 * 사진 한 장 확정 — `PATCH /api/v1/photo-uploads/{id}`.
 *
 * 그 사진에 딸린 **항목 전부**를 함께 보내고, 성공하면 사진이 통째로 확정된다
 * (`status: CONFIRMED`). 공종이 비어 있는 항목이 하나라도 있으면 400이라
 * 여기서도 같은 조건으로 막는다(`confirmBlocker`).
 *
 * **사람이 값을 고친 사진만 이 호출을 탄다.** AI가 다 맞춘 사진은 승인이 필요 없어
 * 아무도 부르지 않는다 — 그래서 하루 수백 장이 올라와도 호출은 사람이 고친 만큼이고,
 * 그때그때 한 장씩 흩어져 나간다.
 *
 * **값만 저장하는 자리는 없다.** 확인할 칸이 남아 아직 못 보낸 사진의 편집분은
 * 브라우저에만 있다.
 */
export function confirmPhoto(photo: Photo): Promise<Photo> {
  const found = photos.find((p) => p.id === photo.id)
  if (!found) throw new Error('사진을 찾을 수 없습니다')

  const blocker = confirmBlocker(photo)
  if (blocker) throw new Error(blocker)

  Object.assign(found, {
    workDate: photo.workDate,
    location: photo.location,
    // 양식을 채우려고 만든 빈 줄은 보내지 않는다
    workItems: photo.workItems.filter(hasContent),
    /*
     * 확인 필요 표시도 함께 넘긴다.
     * 사람이 고쳐서 지운 표시가 남아 있으면 다시 불러올 때 노란 칸이 되살아난다.
     */
    uncertain: photo.uncertain,
    reviewStatus: 'confirmed' as const,
  })
  return delay({ ...found }, 200)
}
