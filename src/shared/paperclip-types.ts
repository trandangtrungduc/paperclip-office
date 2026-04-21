// Types mirroring Paperclip's data model

export type AgentRole =
  | 'ceo' | 'cto' | 'cmo' | 'cfo'
  | 'engineer' | 'designer' | 'pm' | 'qa'
  | 'devops' | 'researcher' | 'general'

export type AgentStatus =
  | 'active' | 'paused' | 'idle' | 'running'
  | 'error' | 'pending_approval' | 'terminated'

export type PauseReason = 'manual' | 'budget' | 'system'

export type IssueStatus =
  | 'backlog' | 'todo' | 'in_progress'
  | 'in_review' | 'done' | 'blocked' | 'cancelled'

export type IssuePriority = 'critical' | 'high' | 'medium' | 'low'

export type ApprovalType =
  | 'hire_agent' | 'approve_ceo_strategy'
  | 'budget_override_required' | 'request_board_approval'

export type ApprovalStatus =
  | 'pending' | 'revision_requested'
  | 'approved' | 'rejected' | 'cancelled'

export type CompanyStatus = 'active' | 'paused' | 'archived'

export type HeartbeatRunStatus =
  | 'queued' | 'running' | 'succeeded'
  | 'failed' | 'cancelled' | 'timed_out'

export type PluginStatus =
  | 'installed' | 'ready' | 'disabled'
  | 'error' | 'upgrade_pending' | 'uninstalled'

// --- Entity types ---

export interface Company {
  id: string
  name: string
  description: string | null
  status: CompanyStatus
  createdAt: string
  updatedAt: string
}

export interface Agent {
  id: string
  companyId: string
  name: string
  role: AgentRole
  title: string | null
  icon: string | null
  status: AgentStatus
  reportsTo: string | null
  adapterType: string
  budgetMonthlyCents: number
  spentMonthlyCents: number
  pauseReason: PauseReason | null
  lastHeartbeatAt: string | null
  capabilities: string[]
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  companyId: string
  name: string
  description: string | null
  status: string
  goalId: string | null
  createdAt: string
  updatedAt: string
}

export interface Issue {
  id: string
  companyId: string
  projectId: string | null
  goalId: string | null
  parentId: string | null
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  assigneeAgentId: string | null
  createdByAgentId: string | null
  issueNumber: number
  identifier: string
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  companyId: string
  title: string
  level: 'company' | 'team' | 'agent' | 'task'
  status: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface Approval {
  id: string
  companyId: string
  type: ApprovalType
  status: ApprovalStatus
  createdByAgentId: string | null
  decidedByUserId: string | null
  decisionNote: string | null
  createdAt: string
  decidedAt: string | null
}

export interface CostSummary {
  totalCostCents: number
  byAgent: Array<{
    agentId: string
    agentName: string
    costCents: number
  }>
}

// Mirrors Paperclip's BILLING_TYPES (packages/shared/src/constants.ts)
export type BillingType =
  | 'metered_api'
  | 'subscription_included'
  | 'subscription_overage'
  | 'credits'
  | 'fixed'
  | 'unknown'

/**
 * One row per (agent, provider, biller, model) from
 * GET /companies/:id/costs/by-agent-model.
 * Shape mirrors Paperclip's CostByAgentModel interface.
 */
export interface CostByAgentModelRow {
  agentId: string
  agentName: string | null
  provider: string
  biller: string
  billingType: BillingType
  model: string
  costCents: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
}

export interface Routine {
  id: string
  companyId: string
  name: string
  schedule: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Plugin {
  id: string
  displayName: string
  version: string
  status: PluginStatus
  categories: string[]
}

export type ActivityEntryKind =
  | 'activity'
  | 'cost'
  | 'heartbeat-log'
  | 'run-started'
  | 'run-completed'
  | 'approval-alert'

export interface ActivityEntry {
  id: string
  actorType: 'agent' | 'user' | 'system'
  action: string
  entityType: string
  entityId: string
  details: Record<string, unknown>
  createdAt: string
  kind?: ActivityEntryKind
  costCents?: number
  modelName?: string
  runId?: string
  runStatus?: HeartbeatRunStatus
}

// --- WebSocket event types ---

export type LiveEventType =
  | 'heartbeat.run.queued'
  | 'heartbeat.run.status'
  | 'heartbeat.run.event'
  | 'heartbeat.run.log'
  | 'agent.status'
  | 'activity.logged'
  | 'plugin.ui.updated'
  | 'plugin.worker.crashed'
  | 'plugin.worker.restarted'

export interface LiveEvent {
  id: number
  companyId: string
  type: LiveEventType
  createdAt: string
  payload: Record<string, unknown>
}

// --- State snapshot (initial load) ---

export interface CompanySnapshot {
  company: Company
  agents: Agent[]
  projects: Project[]
  issues: Issue[]
  goals: Goal[]
  approvals: Approval[]
  costSummary: CostSummary | null
  costByAgentModel: CostByAgentModelRow[]
  activity: ActivityEntry[]
  routines: Routine[]
  plugins: Plugin[]
}
