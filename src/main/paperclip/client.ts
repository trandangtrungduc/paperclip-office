import ky, { type KyInstance } from 'ky'
import type {
  Company, Agent, Project, Issue, Goal,
  Approval, CostSummary, CostByAgentModelRow,
  ActivityEntry, Routine, Plugin
} from '@shared/paperclip-types'

export class PaperclipClient {
  readonly baseUrl: string
  readonly apiKey: string
  private http: KyInstance

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.apiKey = apiKey ?? ''

    const headers: Record<string, string> = {}
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    this.http = ky.create({
      prefixUrl: `${this.baseUrl}/api`,
      headers,
      timeout: 15_000,
      retry: { limit: 2, delay: () => 1000 }
    })
  }

  async getHealth(): Promise<void> {
    await this.http.get('health')
  }

  async getCompanies(): Promise<Company[]> {
    const res = await this.http.get('companies').json<{ data: Company[] }>()
    return res.data ?? (res as unknown as Company[])
  }

  async getCompany(companyId: string): Promise<Company> {
    return this.http.get(`companies/${companyId}`).json<Company>()
  }

  async getAgents(companyId: string): Promise<Agent[]> {
    const res = await this.http.get(`companies/${companyId}/agents`).json<{ data: Agent[] }>()
    return res.data ?? (res as unknown as Agent[])
  }

  async getProjects(companyId: string): Promise<Project[]> {
    const res = await this.http.get(`companies/${companyId}/projects`).json<{ data: Project[] }>()
    return res.data ?? (res as unknown as Project[])
  }

  async getIssues(companyId: string): Promise<Issue[]> {
    const res = await this.http.get(`companies/${companyId}/issues`).json<{ data: Issue[] }>()
    return res.data ?? (res as unknown as Issue[])
  }

  async getGoals(companyId: string): Promise<Goal[]> {
    const res = await this.http.get(`companies/${companyId}/goals`).json<{ data: Goal[] }>()
    return res.data ?? (res as unknown as Goal[])
  }

  async getApprovals(companyId: string): Promise<Approval[]> {
    const res = await this.http.get(`companies/${companyId}/approvals`).json<{ data: Approval[] }>()
    return res.data ?? (res as unknown as Approval[])
  }

  async getCostSummary(companyId: string): Promise<CostSummary | null> {
    try {
      return await this.http.get(`companies/${companyId}/costs/summary`).json<CostSummary>()
    } catch {
      return null
    }
  }

  async getCostByAgentModel(companyId: string): Promise<CostByAgentModelRow[]> {
    try {
      const res = await this.http
        .get(`companies/${companyId}/costs/by-agent-model`)
        .json<CostByAgentModelRow[] | { data: CostByAgentModelRow[] }>()
      if (Array.isArray(res)) return res
      return res.data ?? []
    } catch {
      return []
    }
  }

  async getActivity(companyId: string): Promise<ActivityEntry[]> {
    const res = await this.http.get(`companies/${companyId}/activity`).json<{ data: ActivityEntry[] }>()
    return res.data ?? (res as unknown as ActivityEntry[])
  }

  async getRoutines(companyId: string): Promise<Routine[]> {
    const res = await this.http.get(`companies/${companyId}/routines`).json<{ data: Routine[] }>()
    return res.data ?? (res as unknown as Routine[])
  }

  async getPlugins(): Promise<Plugin[]> {
    const res = await this.http.get('plugins').json<{ data: Plugin[] }>()
    return res.data ?? (res as unknown as Plugin[])
  }
}
