/** TanStack Query 키를 한곳에서 관리한다 */
export const queryKeys = {
  projects: ['projects'] as const,
  project: (projectId: string) => ['projects', projectId] as const,
  planWork: (projectId: string) => ['plans', 'work', projectId] as const,
  photos: (projectId: string) => ['photos', projectId] as const,
  /** 목록 한 페이지. `photos` 접두사를 공유해 한 번에 무효화된다 */
  photoPage: (projectId: string, query: object) => ['photos', projectId, 'page', query] as const,
  /** 탭에 붙는 수와 작업일 선택지. 목록과 따로 받는다 */
  photoSummary: (projectId: string, workDate: string) =>
    ['photos', projectId, 'summary', workDate] as const,
  workTypes: (projectId: string) => ['workTypes', projectId] as const,
  aggregation: (projectId: string) => ['aggregation', projectId] as const,
  photo: (photoId: string) => ['photo', photoId] as const,
  workComparison: (projectId: string) => ['comparison', 'process', projectId] as const,
}
