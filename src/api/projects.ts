import { api } from '@/lib/api'
import type { Project } from '@/types'

export interface ProjectInput {
  name: string
  address: string
}

/** 서버가 돌려주는 모양. id만 우리 타입과 다르다 */
interface ProjectResponse extends Omit<Project, 'id'> {
  id: number
}

/**
 * 서버가 채번한 정수 id를 문자열로 바꾼다.
 *
 * 프로젝트 id는 늘 주소창을 거쳐 다닌다(`/projects/:projectId/...`).
 * `useParams`가 주는 값이 문자열이라 여기서 한 번 맞춰두면, 화면도 다른 API도
 * 프로젝트 id를 문자열 하나로만 다룬다 — 곳곳에서 `Number()`를 부르지 않는다.
 */
function toProject({ id, ...rest }: ProjectResponse): Project {
  return { ...rest, id: String(id) }
}

export async function getProjects(): Promise<Project[]> {
  const list = await api.get<ProjectResponse[]>('/api/v1/projects')
  return list.map(toProject)
}

export async function getProject(projectId: string): Promise<Project> {
  return toProject(await api.get<ProjectResponse>(`/api/v1/projects/${projectId}`))
}

/**
 * 프로젝트를 만든다.
 *
 * **공종은 여기서 등록하지 않는다.** 프로젝트가 생긴 뒤에야 붙일 자리가 생기므로
 * 만들어진 id로 일괄 등록을 따로 부른다(`createWorkTypes`). 둘을 한 함수로 묶으면
 * 공종만 실패했을 때 프로젝트까지 실패한 것처럼 보인다.
 */
export async function createProject(input: ProjectInput): Promise<Project> {
  return toProject(await api.post<ProjectResponse>('/api/v1/projects', input))
}

/**
 * 프로젝트를 지운다.
 *
 * **딸린 것이 전부 함께 사라진다** — 올린 사진과 검수 결과, 공종, 계획.
 * 되돌리는 자리는 없으므로 부르기 전에 화면에서 한 번 더 묻는다.
 */
export function removeProject(projectId: string): Promise<void> {
  return api.delete<void>(`/api/v1/projects/${projectId}`)
}
