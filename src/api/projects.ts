import { delay } from '@/mocks/delay'
import { projects } from '@/mocks/db'
import { trades } from '@/mocks/trades'
import type { Project } from '@/types'

export interface ProjectInput {
  name: string
  siteName: string
  startDate: string | null
  endDate: string | null
  /**
   * 이 현장에서 쓰는 공종 이름들.
   * 규격은 등록하지 않는다 — 사진마다 AI가 읽는다.
   */
  trades: string[]
}

export function getProjects(): Promise<Project[]> {
  return delay([...projects])
}

export function getProject(projectId: string): Promise<Project | undefined> {
  return delay(projects.find((p) => p.id === projectId))
}

export function createProject(input: ProjectInput): Promise<Project> {
  const { trades: tradeNames, ...rest } = input
  const project: Project = {
    id: `p${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...rest,
  }
  projects.push(project)

  tradeNames
    .map((name) => name.trim())
    .filter(Boolean)
    .forEach((name, index) => {
      trades.push({ id: `td${Date.now()}_${index}`, projectId: project.id, name })
    })

  return delay(project)
}
