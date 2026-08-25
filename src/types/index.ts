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

/**
 * 확인이 필요한 칸 → 사유.
 *
 * AI가 채웠지만 사람이 봐야 하는 칸을 표시하는 데 쓴다.
 * 검수 화면은 이 키가 있는 칸만 노랗게 칠하고 사유를 툴팁으로 보여준다.
 * 사람이 그 칸을 고치면 해당 키를 지운다 — 남은 키 수가 곧 남은 일이다.
 */
export type Uncertain<K extends string> = Partial<Record<K, string>>

/** 사진 처리 단계 */
export type PhotoStatus = 'uploading' | 'analyzing' | 'analyzed' | 'failed'

/** 검수 상태 */
export type ReviewStatus = 'pending' | 'confirmed'

/**
 * 규격·수량 한 쌍.
 *
 * 사진대지 양식에서 `작업내용` 라벨 오른쪽의 두 칸이다.
 * 구분은 같은데 규격만 다른 경우가 있어 한 줄에 이 쌍이 여러 개 온다
 * (양식이 제공하는 칸 수는 `SHEET_ENTRY_SLOTS`).
 */
export interface WorkEntry {
  /** 규격 — '1300*800' 같은 자유 텍스트 */
  spec: string | null
  quantity: number | null
  /** AI가 자신 없게 채운 칸 → 확인이 필요한 사유. 사람이 고치면 지운다 */
  uncertain?: Uncertain<'spec' | 'quantity'>
}

/**
 * 사진 한 장에 딸린 작업 항목 한 줄.
 * 사진대지 양식의 `구 분 | 값 | 작업내용 | 규격 | 수량 | (규격 | 수량)` 한 행에 해당한다.
 * 한 사진에 여러 줄이 붙으므로 개수는 고정하지 않는다.
 *
 * 단위는 여기 두지 않는다 — 양식에 칸이 없고,
 * 계획 대비 비교는 계획 데이터의 단위를 기준으로 쓴다(`api/comparison.ts`).
 */
export interface WorkItem {
  id: string
  /** 구분 — 자재명 또는 부위명 */
  category: string | null
  /** 작업내용 — 규격·수량 쌍 */
  entries: WorkEntry[]
  uncertain?: Uncertain<'category'>
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
  uncertain?: Uncertain<'location' | 'workDate'>
  workItems: WorkItem[]
  reviewStatus: ReviewStatus
}

/**
 * 집계 단위.
 * `EA`는 개소를 센다. `M`은 규격의 가로*세로에서 둘레를 뽑아 연장 길이를 센다.
 */
export type AggregateUnit = 'EA' | 'M'

/**
 * 집계 품목 한 종 — 집계표의 행 하나.
 *
 * **백엔드가 구분과 함께 내려준다.** 계수·소구경 경계·HB 묶음은 전부 현장과
 * 발주처마다 달라지는 업무 규칙이라 프론트에 상수로 두지 않는다.
 * 화면은 이 목록이 준 순서대로 행을 깔고, 시킨 대로 묶고 곱하기만 한다.
 *
 * 값이 하나도 없는 품목도 행은 남는다 — 기성 청구 양식이라 행 목록과 순서가 고정이다.
 */
export interface AggregateItem {
  id: string
  /** 집계표에 찍히는 품목명 (예: '금속관벽체50') */
  name: string
  /** 사진대지의 `구분`과 맞춰볼 값 (예: '금속관벽체') */
  category: string
  /**
   * 사진대지의 `규격`과 맞춰볼 값.
   * 배관류는 호칭경('50')으로 품목이 갈리고, 덕트류는 구분 하나가 한 품목이라 null이다.
   * null이면 그 구분의 모든 규격을 이 품목으로 받는다.
   */
  spec: string | null
  unit: AggregateUnit
  /**
   * HB 가공 계수.
   * 벽체는 앞뒤 양면을 시공하므로 2, 입상이나 슬리브처럼 단면이면 1이다.
   */
  multiplier: number
  /** HB 가공에서 묶일 이름 (예: 'HB 배관(소구경)') */
  hbGroup: string
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
