export interface ModuleBlueprint {
  name: string
  description: string
}

export interface DatabaseTable {
  table: string
  fields: string[]
}

export interface StackCategory {
  category: string
  technologies: string[]
}

export interface StepPhase {
  phase: string
  tasks: string[]
}

export interface ProjectBlueprint {

  projectName: string

  summary: string

  modules: ModuleBlueprint[]

  database: DatabaseTable[]

  stack: StackCategory[]

  steps: StepPhase[]

}