/**
 * 도메인 타입.
 *
 * 기능명세가 아직 초안이라 확정된 항목만 얕게 정의한다.
 * 신뢰도, 확인 필요 사유, OCR 원문, 검수 이력처럼 들어갈지 미정인 것은
 * 지금 모델링하지 않는다 — 확정되면 여기에 필드를 더한다.
 */

/**
 * 프로젝트(공사 현장).
 *
 * 서버가 쥔 것은 이 넷뿐이다. 공사 기간은 서버에 자리가 없어 화면에서도 받지 않는다 —
 * 저장되지 않는 칸을 두면 입력한 사람은 저장된 줄 안다.
 */
export interface Project {
  /**
   * 서버가 채번한 정수를 문자열로 받아 쓴다.
   * 프로젝트 id는 늘 주소창을 거쳐 다니고(`/projects/:projectId/...`)
   * `useParams`가 주는 값은 문자열이라, 경계에서 한 번 맞추면 화면과 나머지 API가
   * 전부 같은 모양을 쓴다(`src/api/projects.ts`의 `toProject`).
   */
  id: string
  /** 공사명 */
  name: string
  /** 현장 주소 */
  address: string
  createdAt: string
}

/**
 * 계획 공정 한 줄.
 *
 * **자재 계획은 두지 않는다.** 서버가 자재 실적을 따로 재지 않고 확정된 작업 수량을
 * 자재 사용량으로 갈음해서, 계획 자재와 견줘봐야 단위가 다른 숫자를 나눈 값이 나온다.
 */
export interface PlanWorkItem {
  id: string
  /** 위치 — 현장 양식에서 '지하2층'처럼 한 칸으로 쓰인다 */
  location: string
  /** 공종 id. 서버가 이걸로 받는다. 아직 안 고른 새 줄은 null */
  workTypeId: number | null
  /** 공종 이름 — 화면에 보이는 값 */
  workType: string
  /** 작업내용 */
  description: string
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
  /**
   * 서버 항목(`item`) id. 확정할 때 어느 항목을 고치는지 이걸로 가리킨다.
   * **사람이 새로 만든 칸에는 없다** — 서버에 아직 항목을 새로 만드는 자리가 없다.
   */
  itemId?: number
  /** 규격 — '1300*800' 같은 자유 텍스트 */
  spec: string | null
  /** 수량 — 현장이 적은 개수(`rawQuantity`). 둘레 연장 환산은 집계가 한다 */
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
  /** 격자에 거는 축소본. 한 화면에 수십 장이 깔려 원본을 그대로 걸지 않는다 */
  thumbnailUrl: string | null
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
 *
 * 서버 응답에는 `unit`도 있지만 여기 두지 않는다 — 화면이 쓰지 않는 값이라
 * 타입에 두면 언젠가 집계 단위와 헷갈려 쓰인다(`src/api/workTypes.ts`).
 */
export interface WorkType {
  /** 서버가 채번한다 */
  id: number
  /** 공종명 (예: '금속관벽체') */
  name: string
}

/** 계획 대비 비교 결과 */
export type CompareStatus = 'match' | 'over' | 'under' | 'insufficient'

/**
 * 계획 대비 현황 한 줄.
 *
 * **공종 단위다.** 계획은 위치·작업내용까지 적지만 실적은 공종까지만 되짚을 수 있어
 * 서버가 공종으로 합쳐서 준다. 그래서 이 표에는 위치 열이 없다.
 */
export interface ComparisonRow {
  workTypeId: number
  workTypeName: string
  unit: string | null
  plannedQuantity: number
  actualQuantity: number
  /** 달성률(%). 계획이 없으면 서버가 0을 준다 */
  achievementRate: number
  /** 계획과 실적을 견준 결과. 서버 값이 아니라 화면이 붙인다 */
  status: CompareStatus
}
