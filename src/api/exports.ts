import { api } from '@/lib/api'

/**
 * 엑셀 내보내기.
 *
 * **파일은 서버가 만든다.** 프론트는 받아서 내려주기만 한다 —
 * 사진이 박힌 원장도, 수식으로 채워진 집계표도 브라우저가 만들 물건이 아니다.
 *
 * 둘은 성격이 다르다.
 * - 사진대지: 팀 표준 양식 그대로. 사진 한 장이 11행 블록, 사진이 삽입된 원장
 * - 집계: 원본 데이터 시트 + SUMIFS 집계표 + 누계. **값이 아니라 수식**이라
 *   엑셀에서 원본을 고치면 집계가 따라 바뀐다
 */

/** 표준 사진대지 엑셀 — 검수 확정된 사진만 담긴다 */
export function downloadSheetExcel(projectId: string, fileName: string): Promise<void> {
  return api.download(`/api/v1/projects/${projectId}/export/excel`, fileName)
}

/** 집계표·누계 엑셀 */
export function downloadAggregationExcel(projectId: string, fileName: string): Promise<void> {
  return api.download(`/api/v1/projects/${projectId}/aggregation/export/excel`, fileName)
}
