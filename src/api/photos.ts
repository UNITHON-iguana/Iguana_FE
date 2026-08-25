import { confirmBlocker } from '@/lib/workItems'
import { photos } from '@/mocks/db'
import { delay } from '@/mocks/delay'
import { placeholderImage } from '@/mocks/placeholder'
import type { Photo, WorkItem } from '@/types'

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

export interface PhotoQuery {
  projectId: string
  workDate: WorkDateFilter
  /** 확인이 필요한 사진만 */
  needsReview: boolean
  /** 1부터 */
  page: number
  size: number
}

/**
 * 진행 상황 카운트.
 *
 * **작업일 필터까지만 적용한다.** `needsReview`와 페이지는 무시한다 —
 * 머리글은 '지금 보고 있는 30장'이 아니라 '이 날 전체가 얼마나 끝났나'를 말해야 한다.
 */
export interface PhotoCounts {
  photos: number
  /** 아직 업로드·분석 중이라 표에 올릴 칸이 없는 사진 */
  inProgress: number
  failed: number
  confirmed: number
  /** 아직 확정할 수 없는 사진 — 이만큼이 집계와 내보내기에서 빠져 있다 */
  needsReview: number
  /** 확인할 칸이 없고 아직 검수도 안 한 사진 — 한 번에 넘길 수 있다 */
  clearPending: number
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
  counts: PhotoCounts
  workDates: WorkDateOption[]
}

/**
 * 사람이 봐야 하는 사진 — 지금 이대로는 검수 완료로 넘길 수 없는 사진.
 *
 * 확정된 사진만 집계와 내보내기에 들어가므로 이 목록이 곧 '아직 실적이 아닌 사진'이다.
 * 확인 필요 필터·일괄 확정·자동 확정이 모두 같은 기준(`confirmBlocker`)을 쓴다.
 */
function needsEye(photo: Photo): boolean {
  return confirmBlocker(photo) !== null
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

/**
 * 사진 목록 한 페이지.
 *
 * 하루에 수백 장이 올라오므로 목록은 잘라서 준다.
 * 지금은 목이라 전부 들고 있다가 자르지만, **자르는 일은 원래 서버 몫이다** —
 * 백엔드가 붙으면 이 함수 안쪽만 바뀌고 화면은 그대로다.
 */
export function getPhotoPage(query: PhotoQuery): Promise<PhotoPage> {
  const all = photos.filter((p) => p.projectId === query.projectId)

  const byDate = new Map<string | null, number>()
  for (const photo of all) {
    byDate.set(photo.workDate, (byDate.get(photo.workDate) ?? 0) + 1)
  }
  const workDates: WorkDateOption[] = [...byDate.entries()]
    .map(([workDate, count]) => ({ workDate, photos: count }))
    // 최근 작업일이 위로. 작업일이 빈 것은 맨 아래에 둔다
    .sort((a, b) => (b.workDate ?? '').localeCompare(a.workDate ?? ''))

  const inDate = all.filter((photo) => matchesWorkDate(photo, query.workDate))
  const settled = inDate.filter(isSettled)

  const counts: PhotoCounts = {
    photos: inDate.length,
    inProgress: inDate.length - settled.length,
    failed: inDate.filter((p) => p.status === 'failed').length,
    confirmed: inDate.filter((p) => p.reviewStatus === 'confirmed').length,
    needsReview: settled.filter(needsEye).length,
    clearPending: inDate.filter(
      (p) => p.status === 'analyzed' && p.reviewStatus === 'pending' && !needsEye(p),
    ).length,
  }

  const filtered = query.needsReview ? settled.filter(needsEye) : settled
  const start = (query.page - 1) * query.size

  return delay({
    items: filtered.slice(start, start + query.size).map((p) => ({ ...p })),
    total: filtered.length,
    page: query.page,
    size: query.size,
    counts,
    workDates,
  })
}

/**
 * 확인할 칸이 없는 사진을 한 번에 검수 완료로 넘긴다.
 *
 * 화면에 올라온 30장이 아니라 **조건에 걸린 전부**가 대상이라 서버가 할 일이다.
 * 프론트에서 돌면 페이지에 없는 사진은 넘어가지 않는다.
 */
export function confirmClearPhotos(projectId: string, workDate: WorkDateFilter): Promise<number> {
  const targets = photos.filter(
    (p) =>
      p.projectId === projectId &&
      matchesWorkDate(p, workDate) &&
      p.status === 'analyzed' &&
      p.reviewStatus === 'pending' &&
      !needsEye(p),
  )
  targets.forEach((photo) => {
    photo.reviewStatus = 'confirmed'
  })
  return delay(targets.length, 300)
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
         * 확인할 칸이 없으면 사람 손을 기다리지 않고 바로 확정한다.
         * 검수는 AI가 자신 없어 한 사진에만 하는 일이고, 나머지는 올린 즉시 실적이 된다.
         */
        photo.reviewStatus = confirmBlocker(photo) === null ? 'confirmed' : 'pending'
      },
      1500 + index * 1200,
    )
  })

  return delay(undefined, 200)
}

export interface PhotoReviewInput {
  workDate: string | null
  location: string | null
  workItems: WorkItem[]
  reviewStatus: Photo['reviewStatus']
  /*
   * 확인 필요 표시도 함께 저장한다.
   * 사람이 고쳐서 지운 표시가 저장되지 않으면 다시 불러올 때 노란 칸이 되살아난다.
   */
  uncertain: Photo['uncertain']
}

export function savePhotoReview(photoId: string, input: PhotoReviewInput): Promise<Photo> {
  const photo = photos.find((p) => p.id === photoId)
  if (!photo) throw new Error('사진을 찾을 수 없습니다')

  Object.assign(photo, input)
  return delay({ ...photo }, 400)
}
