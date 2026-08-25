/** 현장 사진 업로드가 허용하는 이미지 형식 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const

export const ACCEPTED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png'

/** 계획 데이터 업로드가 허용하는 엑셀 형식 */
export const ACCEPTED_EXCEL_EXTENSIONS = '.xlsx'

/**
 * 사진대지 한 페이지에 올리는 사진 수.
 *
 * 하루에 수백 장이 올라오는데 사진 한 장이 격자 4행 · 입력칸 16개를 차지한다.
 * 다 펼치면 입력칸이 수천 개가 되어 글자 하나 칠 때마다 화면이 밀린다.
 */
export const PHOTOS_PER_PAGE = 30

/** 사진대지 양식이 사진 한 장에 기본으로 제공하는 작업 항목 줄 수. 실제 개수는 제한하지 않는다 */
export const DEFAULT_WORK_ITEM_ROWS = 3

/**
 * 사진대지 양식이 한 줄에 제공하는 규격·수량 칸 수.
 *
 * 원본 엑셀 양식은 `작업내용` 오른쪽에 규격·수량 쌍을 두 벌 둔다.
 * 구분은 같은데 규격만 다른 경우를 한 줄에 적기 위한 칸이다.
 */
export const SHEET_ENTRY_SLOTS = 2

export const PHOTO_STATUS_LABEL = {
  uploading: '업로드 중',
  analyzing: '분석 중',
  analyzed: '분석 완료',
  failed: '분석 실패',
} as const

export const REVIEW_STATUS_LABEL = {
  pending: '미검수',
  confirmed: '검수 완료',
} as const

/**
 * 집계 단위.
 * 배관류는 개소를 세고, 덕트류는 규격의 가로*세로에서 둘레를 뽑아 연장 길이를 센다.
 */
export const AGGREGATE_UNIT_LABEL = {
  EA: '개소',
  M: 'M',
} as const

export const COMPARE_STATUS_LABEL = {
  match: '일치',
  over: '초과',
  under: '미달',
  insufficient: '비교 데이터 부족',
} as const
