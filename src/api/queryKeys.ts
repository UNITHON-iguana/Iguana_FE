/** TanStack Query 키를 한곳에서 관리한다 */
export const queryKeys = {
  projects: ['projects'] as const,
  project: (projectId: string) => ['projects', projectId] as const,
  planWork: (projectId: string) => ['plans', 'work', projectId] as const,
  planMaterial: (projectId: string) => ['plans', 'material', projectId] as const,
  photos: (projectId: string) => ['photos', projectId] as const,
  /** 목록 한 페이지. `photos` 접두사를 공유해 한 번에 무효화된다 */
  photoPage: (projectId: string, query: object) => ['photos', projectId, 'page', query] as const,
  aggregateItems: (projectId: string) => ['aggregateItems', projectId] as const,
  photo: (photoId: string) => ['photo', photoId] as const,
  workComparison: (projectId: string) => ['comparison', 'work', projectId] as const,
  materialComparison: (projectId: string) => ['comparison', 'material', projectId] as const,
}
