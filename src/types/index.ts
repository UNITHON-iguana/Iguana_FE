/** 검수 상태 — AI 추출값을 사용자가 확정했는지 여부 */
export type ReviewStatus = 'pending' | 'needs_check' | 'confirmed'

/** 프로젝트(현장) */
export interface Project {
  id: string
  name: string
  createdAt: string
}

/** 계획 데이터 한 줄 — 엑셀 업로드 또는 직접 입력으로 등록 */
export interface PlanItem {
  id: string
  projectId: string
  /** 계획 작업일 */
  plannedDate: string
  zone: string
  workType: string
  workDescription: string
  material: string
  /** 계획 수량. 미입력 시 비교 데이터 부족으로 표시한다 */
  quantity: number | null
  unit: string | null
}

/** 업로드한 현장 사진 1장과 그 분석 결과 */
export interface PhotoRecord {
  id: string
  projectId: string
  fileName: string
  /** 원본 이미지 */
  originalUrl: string
  /** AI가 분리한 작업 사진 영역 */
  photoRegion: BoundingBox | null
  /** AI가 분리한 텍스트(보드판) 영역 */
  textRegion: BoundingBox | null
  status: 'uploading' | 'analyzing' | 'analyzed' | 'failed'
  failureReason: string | null
  extracted: ExtractedWorkData | null
  reviewStatus: ReviewStatus
}

/** 이미지 내 좌표 — 원본 크기 대비 0~1 비율 */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * OCR 결과를 구조화한 공사 데이터.
 * 사진에서 읽어내지 못한 값은 임의로 채우지 않고 null로 둔다.
 */
export interface ExtractedWorkData {
  workDate: string | null
  zone: string | null
  workType: string | null
  workDescription: string | null
  material: string | null
  quantity: number | null
  unit: string | null
  /** OCR 원문 — 검수 화면에서 대조용으로 보여준다 */
  rawText: string | null
}

/** 계획 대비 실제 비교 한 줄 */
export interface ComparisonRow {
  key: string
  zone: string
  workType: string
  material: string
  plannedQuantity: number | null
  actualQuantity: number | null
  unit: string | null
  /** 계획 또는 실적이 없으면 비교 불가 */
  comparable: boolean
}
