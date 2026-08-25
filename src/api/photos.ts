import { api } from '@/lib/api'
import { confirmBlocker, hasContent } from '@/lib/workItems'
import type { Photo, WorkItem, WorkType } from '@/types'

/**
 * 서버가 돌려주는 사진 한 장(`PhotoUpload`).
 *
 * 우리 `Photo`와 두 군데가 다르다.
 * - **항목이 평평하다.** 한 `item`이 공종·규격·수량 하나를 통째로 들고 있어,
 *   같은 공종이 규격만 다르게 여러 번 오면 `item`도 그만큼 온다.
 *   사진대지 양식은 한 줄에 공종 하나·규격 여러 개라 여기서 묶는다(`toWorkItems`).
 * - **어느 칸이 미심쩍은지는 안 알려준다.** 사진 단위 `needsReview` 하나뿐이고,
 *   그게 서는 이유는 '공종을 못 찾은 항목이 있다' 하나다. 그래서 노란 칸도
 *   공종 칸에만 선다 — 규격·수량·위치·작업일에는 설 근거가 없다.
 */
interface PhotoUploadResponse {
  id: number
  originalUrl: string
  thumbnailUrl: string
  location: string | null
  workDate: string | null
  needsReview: boolean
  status: 'UNCONFIRMED' | 'CONFIRMED'
  items: PhotoItemResponse[]
}

interface PhotoItemResponse {
  id: number
  /** AI가 프로젝트의 공종 목록에서 못 찾았으면 null. 그 사진이 검수로 간다 */
  workTypeId: number | null
  workTypeName: string | null
  /** AI가 읽은 원문. 정형화 전 값이라 화면에는 안 쓴다 */
  rawOcrText: string | null
  spec: string | null
  rawQuantity: number | null
  quantity: number | null
}

/** 공종을 못 찾은 항목에 다는 표시. 사진대지에서 이 칸이 노랗게 뜬다 */
const NO_WORK_TYPE = 'AI가 공종을 찾지 못했습니다. 목록에서 골라주세요'

/**
 * 평평한 `items`를 사진대지 줄로 묶는다.
 *
 * 같은 공종끼리 한 줄로 합치고 규격·수량은 그 줄의 칸으로 늘어놓는다 —
 * 양식이 한 줄에 공종 하나만 갖기 때문이다. 칸 수를 넘치면 내보내기 직전에
 * 줄을 다시 나눈다(`splitToFormRows`).
 *
 * **공종을 못 찾은 항목은 묶지 않는다.** 무엇끼리 같은 공종인지 알 수 없어서다.
 * 한 줄씩 따로 세워야 사람이 각각 다른 공종을 고를 수 있다.
 */
function toWorkItems(items: PhotoItemResponse[]): WorkItem[] {
  const rows: WorkItem[] = []
  const byWorkType = new Map<number, WorkItem>()

  for (const item of items) {
    /*
     * 사진대지 수량 칸은 `rawQuantity` — 현장이 적은 개수 그대로다.
     * `quantity`는 규격을 둘레 연장으로 환산한 **집계 쪽 값**이라 여기 쓰지 않는다.
     * 섞이면 화면 수량과 사진 속 숫자가 어긋난다(`docs/집계-규칙.md`).
     */
    const entry = { itemId: item.id, spec: item.spec, quantity: item.rawQuantity }

    if (item.workTypeId == null) {
      rows.push({
        id: String(item.id),
        category: null,
        entries: [entry],
        uncertain: { category: NO_WORK_TYPE },
      })
      continue
    }

    const row = byWorkType.get(item.workTypeId)
    if (row) {
      row.entries.push(entry)
      continue
    }

    const created: WorkItem = {
      id: String(item.id),
      category: item.workTypeName,
      entries: [entry],
    }
    byWorkType.set(item.workTypeId, created)
    rows.push(created)
  }

  return rows
}

/** 서버가 준 사진 한 장을 화면이 쓰는 모양으로 옮긴다 */
function toPhoto(res: PhotoUploadResponse, projectId: string): Photo {
  const workItems = toWorkItems(res.items)

  return {
    id: String(res.id),
    projectId,
    /*
     * 사진번호. 서버에 따로 없어서 채번된 id를 그대로 쓴다 —
     * 정수이고 올린 순서대로 커져 사진대지 정렬 기준은 맞는다.
     * 사람이 읽는 번호를 서버가 주기 시작하면 여기만 바꾼다.
     */
    seq: res.id,
    // 서버가 파일명을 안 준다. S3 키 끝을 잘라 쓰되 uuid 접두사는 그대로 보인다
    fileName: res.originalUrl.split('/').pop() ?? '',
    originalUrl: res.originalUrl,
    thumbnailUrl: res.thumbnailUrl,
    workDate: res.workDate,
    location: res.location,
    /*
     * 서버가 검수로 보냈는데 공종 빈 줄은 없는 경우 — 우리가 모르는 이유로 걸린 것이다.
     * 그냥 두면 그 사진이 사진대지 탭으로 새어 들어가 검수 없이 실적이 된다.
     * 사진 단위로 표시를 세워 검수 탭에 붙들어 둔다.
     */
    uncertain:
      res.needsReview && !workItems.some((item) => item.uncertain?.category)
        ? { location: '서버가 확인이 필요하다고 표시한 사진입니다' }
        : undefined,
    workItems,
    reviewStatus: res.status === 'CONFIRMED' ? 'confirmed' : 'pending',
  }
}

/** 업로드 결과 — 몇 장이 들어왔고 그중 몇 장을 사람이 봐야 하는지 */
export interface PhotoUploadResult {
  photos: Photo[]
  createdCount: number
  needsReviewCount: number
}

/**
 * 현장 사진을 올린다 — `POST /api/v1/projects/{projectId}/photos/bulk`.
 *
 * **올리기와 분석이 한 호출이다.** 서버가 S3에 넣고, 그 프로젝트의 공종 목록을 꺼내
 * AI에 이미지와 함께 넘기고, 돌아온 결과를 사진 단위로 저장한 뒤 201로 **결과까지**
 * 돌려준다. 그래서 프론트에 분석을 따로 거는 자리가 없고, 진행 상황을 물어볼 일도 없다 —
 * 이 호출이 끝나면 이미 다 끝나 있다.
 *
 * AI는 프로젝트에 등록된 공종 안에서만 고른다. 목록에 없는 공종이 사진에 적혀 있으면
 * 그 항목은 공종이 빈 채로 오고, **항목 하나만 그래도 사진 전체가** 검수로 넘어간다.
 */
export async function addPhotos(projectId: string, files: File[]): Promise<PhotoUploadResult> {
  const form = new FormData()
  for (const file of files) form.append('images', file)

  const res = await api.post<{
    createdPhotoCount: number
    needsReviewPhotoCount: number
    photoUploads: PhotoUploadResponse[]
  }>(`/api/v1/projects/${projectId}/photos/bulk`, form)

  return {
    photos: res.photoUploads.map((photo) => toPhoto(photo, projectId)),
    createdCount: res.createdPhotoCount,
    needsReviewCount: res.needsReviewPhotoCount,
  }
}

/**
 * 작업일 필터. `'all'`은 전체, 나머지는 `'YYYY-MM-DD'`.
 *
 * 작업일이 **비어 있는** 사진만 보는 선택지는 없다 — 서버가 `date`를 생략하면 전체라
 * '없음'을 물어볼 방법이 없다.
 */
export type WorkDateFilter = 'all' | (string & {})

/**
 * 목록에 담을 사진.
 *
 * 화면이 두 탭으로 갈리고 이 값이 곧 그 탭이다.
 * `review`는 확인할 칸이 남아 손을 봐야 하는 사진, `sheet`는 손볼 것이 없는 사진대지다.
 * 서버의 `needsReview` 한 값이 두 쪽을 가른다 — 겹치지 않고, 합치면 올라온 사진 전부다.
 *
 * **`sheet` 쪽이 곧 실적이다.** AI가 다 맞춘 사진은 사람 승인 없이 그대로 집계에
 * 들어가고, 사람이 값을 고친 사진만 확정 API를 타고 서버에 올라간다.
 */
export type PhotoScope = 'review' | 'sheet'

export interface PhotoQuery {
  projectId: string
  workDate: WorkDateFilter
  scope: PhotoScope
  /** 1부터. 서버는 0부터라 보낼 때 하나 뺀다 */
  page: number
  size: number
}

/**
 * 탭에 붙는 수.
 *
 * **작업일 필터까지만 적용한다.** `scope`와 페이지는 무시한다 —
 * 탭 이름에 붙는 수라 '지금 보고 있는 30장'이 아니라 '이 날 전체가 얼마나 남았나'를 말한다.
 */
export interface PhotoCounts {
  photos: number
  /** 확인할 칸이 남아 검수 탭에 있는 사진 */
  needsReview: number
  /** 손볼 것이 없어 사진대지 탭에 있는 사진. 집계와 내보내기가 세는 것도 이것이다 */
  sheet: number
}

/** 작업일 선택지 한 줄 */
export interface WorkDateOption {
  workDate: string
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

interface PhotoPageResponse {
  content: PhotoUploadResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** 목록 조회 한 번. `needsReview`를 생략하면 전체다 */
function fetchPage(
  projectId: string,
  params: { needsReview?: boolean; date?: string; page: number; size: number },
): Promise<PhotoPageResponse> {
  const search = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  })
  if (params.needsReview !== undefined) search.set('needsReview', String(params.needsReview))
  if (params.date) search.set('date', params.date)

  return api.get<PhotoPageResponse>(
    `/api/v1/projects/${projectId}/photo-uploads?${search.toString()}`,
  )
}

/**
 * 사진 목록 한 페이지 — `GET /api/v1/projects/{id}/photo-uploads`.
 *
 * 하루에 수백 장이 올라오고 사진 한 장이 격자 4행을 차지해서 잘라 받는다.
 * 탭은 `needsReview`로, 작업일은 `date`로 서버가 걸러 준다.
 */
export async function getPhotoPage(query: PhotoQuery): Promise<PhotoPage> {
  const res = await fetchPage(query.projectId, {
    needsReview: query.scope === 'review',
    date: query.workDate === 'all' ? undefined : query.workDate,
    // 서버 페이지는 0부터다
    page: query.page - 1,
    size: query.size,
  })

  return {
    items: res.content.map((photo) => toPhoto(photo, query.projectId)),
    total: res.totalElements,
    page: res.page + 1,
    size: res.size,
  }
}

/**
 * 화면 틀이 쓰는 값 — 탭에 붙는 수.
 *
 * **목록과 따로 받는다.** 손볼 사진이 있으면 검수 탭으로, 없으면 사진대지 탭으로 여는데,
 * 이 값이 목록에 딸려 오면 목록을 받아야 탭이 정해지고 탭이 정해져야 목록을 받는
 * 순환이 된다.
 *
 * 세는 전용 API가 없어서 목록을 `size=1`로 두 번 불러 `totalElements`만 꺼낸다.
 * 사진은 한 장도 안 실려 오므로 장수와 무관하게 값이 싸다.
 *
 * **작업일 선택지는 비어 있다.** 어떤 작업일이 있는지 알려주는 API가 없다 —
 * 목록으로는 지금 페이지에 실린 30장의 날짜밖에 못 보고, 그걸 전체인 양 내놓으면
 * 사람이 없는 날을 고르게 된다. 서버가 날짜 목록을 주면 여기만 채우면 된다.
 */
export async function getPhotoSummary(
  projectId: string,
  workDate: WorkDateFilter,
): Promise<PhotoSummary> {
  const date = workDate === 'all' ? undefined : workDate
  const [review, sheet] = await Promise.all([
    fetchPage(projectId, { needsReview: true, date, page: 0, size: 1 }),
    fetchPage(projectId, { needsReview: false, date, page: 0, size: 1 }),
  ])

  return {
    counts: {
      photos: review.totalElements + sheet.totalElements,
      needsReview: review.totalElements,
      sheet: sheet.totalElements,
    },
    workDates: [],
  }
}

/**
 * 사진을 지운다.
 *
 * **서버에 자리가 없다.** 삭제 API가 생길 때까지 부르는 쪽에 사실대로 알린다 —
 * 조용히 성공한 척하면 목록을 다시 받을 때 지운 사진이 되살아나 더 헷갈린다.
 */
export function removePhoto(): Promise<void> {
  return Promise.reject(new Error('사진 삭제는 아직 서버에 없습니다'))
}

/**
 * 사진 한 장 확정 — `PATCH /api/v1/photo-uploads/{id}`.
 *
 * 그 사진에 딸린 **항목 전부**를 함께 보내고, 성공하면 사진이 통째로 확정된다
 * (`status: CONFIRMED`, `needsReview: false`). 공종이 비어 있는 항목이 하나라도 있으면
 * 400이라 여기서도 같은 조건으로 막는다(`confirmBlocker`).
 *
 * **사람이 값을 고친 사진만 이 호출을 탄다.** AI가 다 맞춘 사진은 승인이 필요 없어
 * 아무도 부르지 않는다 — 그래서 하루 수백 장이 올라와도 호출은 사람이 고친 만큼이고,
 * 그때그때 한 장씩 흩어져 나간다.
 *
 * 화면은 공종을 **이름**으로 다룬다(사진대지 `구 분` 칸이 이름을 고른다). 서버는 id를
 * 받으므로 등록된 공종 목록으로 이름을 id로 옮긴다.
 *
 * **`quantity`는 보내지 않는다.** 규격을 둘레 연장으로 환산한 집계 쪽 값이고,
 * 그 환산 규칙은 서버에만 있다 — 프론트에 더하기·곱하기 규칙을 두지 않기로 했다.
 * 사람이 고치는 것은 개수(`rawQuantity`)뿐이다.
 */
export async function confirmPhoto(photo: Photo, workTypes: WorkType[]): Promise<Photo> {
  const blocker = confirmBlocker(photo)
  if (blocker) throw new Error(blocker)

  const idByName = new Map(workTypes.map((workType) => [workType.name, workType.id]))

  const items = photo.workItems.filter(hasContent).flatMap((item) =>
    item.entries
      // 양식을 채우려고 깔아둔 빈 칸은 보내지 않는다
      .filter((entry) => entry.itemId != null && (entry.spec || entry.quantity != null))
      .map((entry) => ({
        itemId: entry.itemId,
        workTypeId: item.category ? (idByName.get(item.category) ?? null) : null,
        spec: entry.spec,
        rawQuantity: entry.quantity,
      })),
  )

  const res = await api.patch<PhotoUploadResponse>(`/api/v1/photo-uploads/${photo.id}`, { items })
  return toPhoto(res, photo.projectId)
}
