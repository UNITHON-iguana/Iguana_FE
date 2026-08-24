/**
 * 도메인 타입.
 *
 * 기능명세가 아직 초안이라 확정된 항목만 얕게 정의한다.
 * 신뢰도, 확인 필요 사유, OCR 원문, 검수 이력처럼 들어갈지 미정인 것은
 * 지금 모델링하지 않는다 — 확정되면 여기에 필드를 더한다.
 */

/** 프로젝트(공사 현장) */
export interface Project {
  id: string
  /** 공사명 */
  name: string
  /** 현장명 */
  siteName: string
  startDate: string | null
  endDate: string | null
  createdAt: string
}

/** 계획 공정 데이터 한 줄 */
export interface PlanWorkItem {
  id: string
  projectId: string
  /** 위치 — 현장 양식에서 '지하2층'처럼 한 칸으로 쓰인다 */
  location: string
  workType: string
  description: string
  quantity: number | null
  unit: string | null
}

/** 계획 자재 데이터 한 줄 */
export interface PlanMaterialItem {
  id: string
  projectId: string
  location: string
  workType: string
  material: string
  quantity: number | null
  unit: string | null
}

/** 사진 처리 단계 */
export type PhotoStatus = 'uploading' | 'analyzing' | 'analyzed' | 'failed'

/** 검수 상태 */
export type ReviewStatus = 'pending' | 'confirmed'

/**
 * 사진 한 장에 딸린 작업 항목 한 줄.
 * 사진대지 양식에서 '구분 / 작업내용 / 규격 / 수량' 한 행에 해당한다.
 * 한 사진에 여러 줄이 붙으므로 개수는 고정하지 않는다.
 */
export interface WorkItem {
  id: string
  /** 구분 — 자재명 또는 부위명 */
  category: string | null
  /** 작업내용 */
  description: string | null
  /** 규격 — '800*400' 같은 자유 텍스트 */
  spec: string | null
  quantity: number | null
  unit: string | null
}

/** 업로드한 현장 사진 한 장 */
export interface Photo {
  id: string
  projectId: string
  /** 사진번호 — 사진대지에 표시된다 */
  seq: number
  fileName: string
  originalUrl: string
  /** AI가 분리한 작업 사진. 분리 실패 시 null이며 원본을 대신 쓴다 */
  croppedUrl: string | null
  status: PhotoStatus
  failureReason: string | null
  workDate: string | null
  /** 위치 — 사진 단위로 하나 */
  location: string | null
  workItems: WorkItem[]
  reviewStatus: ReviewStatus
}

/** 계획 대비 비교 결과 */
export type CompareStatus = 'match' | 'over' | 'under' | 'insufficient'

/** 공정·자재 비교가 공유하는 필드 */
export interface ComparisonBase {
  key: string
  location: string
  workType: string
  plannedQuantity: number | null
  actualQuantity: number | null
  unit: string | null
  status: CompareStatus
}

/** 공정 비교 한 줄 */
export interface WorkComparisonRow extends ComparisonBase {
  description: string
}

/** 자재 비교 한 줄 */
export interface MaterialComparisonRow extends ComparisonBase {
  material: string
}
