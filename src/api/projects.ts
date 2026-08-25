import { delay } from '@/mocks/delay'
import { projects } from '@/mocks/db'
import type { Project } from '@/types'

export interface ProjectInput {
  name: string
  siteName: string
  startDate: string | null
  endDate: string | null
}

export function getProjects(): Promise<Project[]> {
  return delay([...projects])
}

export function getProject(projectId: string): Promise<Project | undefined> {
  return delay(projects.find((p) => p.id === projectId))
}

/**
 * 프로젝트를 만든다.
 *
 * **공종은 여기서 등록하지 않는다.** 프로젝트가 생긴 뒤에야 붙일 자리가 생기므로
 * 만들어진 id로 일괄 등록을 따로 부른다(`createTrades`). 둘을 한 함수로 묶으면
 * 공종만 실패했을 때 프로젝트까지 실패한 것처럼 보인다.
 */
export function createProject(input: ProjectInput): Promise<Project> {
  const project: Project = {
    id: `p${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  }
  projects.push(project)

  return delay(project)
}
