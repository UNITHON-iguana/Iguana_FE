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

/**
 * 계획 데이터 한 줄이 공통으로 갖는 필드.
 * 공정과 자재는 이름 칸 하나(`description` / `material`)만 다르다.
 */
export interface PlanItemBase {
  id: string
  projectId: string
  /** 위치 — 현장 양식에서 '지하2층'처럼 한 칸으로 쓰인다 */
  location: string
  workType: string
  quantity: number | null
  unit: string | null
}

/** 계획 공정 데이터 한 줄 */
export interface PlanWorkItem extends PlanItemBase {
  description: string
}

/** 계획 자재 데이터 한 줄 */
export interface PlanMaterialItem extends PlanItemBase {
  material: string
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
 * 공종 — 사진대지의 `구 분`.
 *
 * **이름만 등록한다.** 규격은 사진마다 AI가 읽고, 단위는 서버가 정한다 —
 * 규격이 `2000*600`처럼 오면 둘레 연장으로 환산하므로 사람이 미리 고를 수 있는 값이 아니다.
 * 프로젝트마다 다르고, 사진대지는 이 목록에서 골라 넣는다.
 */
export interface Trade {
  id: string
  projectId: string
  /** 공종명 (예: '금속관벽체') */
  name: string
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
