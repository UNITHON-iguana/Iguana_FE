import { projects } from '@/mocks/db'
import { delay } from '@/mocks/delay'
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

export function createProject(input: ProjectInput): Promise<Project> {
  const project: Project = {
    id: `p${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  }
  projects.push(project)
  return delay(project)
}
