/** 현장 사진 업로드가 허용하는 이미지 형식 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const

export const ACCEPTED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png'

/** 계획 데이터 업로드가 허용하는 엑셀 형식 */
export const ACCEPTED_EXCEL_EXTENSIONS = '.xlsx'

/** 검수 화면에서 기본으로 보여줄 작업 항목 줄 수. 실제 개수는 제한하지 않는다 */
export const DEFAULT_WORK_ITEM_ROWS = 3

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

export const COMPARE_STATUS_LABEL = {
  match: '일치',
  over: '초과',
  under: '미달',
  insufficient: '비교 데이터 부족',
} as const
