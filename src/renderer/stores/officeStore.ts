import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Company, Agent, Project, Issue, Goal,
  Approval, CostSummary, CostByAgentModelRow, Routine, Plugin,
  ActivityEntry, CompanySnapshot, AgentStatus, ActivityEntryKind
} from '@shared/paperclip-types'
import type { ConnectionStatus, NormalizedOfficeEvent } from '@shared/office-events'

// --- Office-specific agent state ---
export interface AgentWithOffice extends Agent {
  office: {
    floorId: string
    spriteState: SpriteState
    currentTask: string | null
    lastBubble: string | null
  }
}

export type SpriteState =
  | 'running'
  | 'active'
  | 'idle'
  | 'paused'
  | 'pending_approval'
  | 'terminated'
  | 'typing'
  | 'thinking'
  | 'leaning_back'
  | 'error'
  | 'waiting_approval'
  | 'walking'
  | 'arriving'
  | 'packing'
  | 'celebrating'
  | 'sleeping'

// --- Floor model ---
export interface Floor {
  id: string
  type: 'executive' | 'project' | 'lobby' | 'server-room' | 'general'
  label: string
  projectId: string | null
  agents: string[] // agent IDs on this floor
}

// --- Store ---
interface OfficeStore {
  // Connection
  connectionStatus: ConnectionStatus
  connectionError: string | null

  // Company data
  company: Company | null
  agents: Map<string, AgentWithOffice>
  projects: Project[]
  issues: Map<string, Issue>
  goals: Goal[]
  approvals: Approval[]
  costSummary: CostSummary | null
  costByAgentModel: CostByAgentModelRow[]
  routines: Routine[]
  plugins: Plugin[]

  // Office layout
  floors: Floor[]

  selectedProjectId: string | null

  // Activity
  activityLog: ActivityEntry[]

  // Actions
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void
  loadSnapshot: (snapshot: CompanySnapshot) => void
  setCostByAgentModel: (rows: CostByAgentModelRow[]) => void
  handleEvent: (event: NormalizedOfficeEvent) => void
  selectProject: (projectId: string) => void
  reset: () => void
}

const MAX_ACTIVITY_LOG = 500

let entrySeq = 0
function synthesizeEntry(
  overrides: Partial<ActivityEntry> & Pick<ActivityEntry, 'action' | 'entityType'> & { kind: ActivityEntryKind }
): ActivityEntry {
  return {
    id: `syn-${Date.now()}-${++entrySeq}`,
    actorType: 'system',
    entityId: '',
    details: {},
    createdAt: new Date().toISOString(),
    ...overrides
  }
}

function prependEntry(log: ActivityEntry[], entry: ActivityEntry): ActivityEntry[] {
  return [entry, ...log].slice(0, MAX_ACTIVITY_LOG)
}

export const GENERAL_FLOOR_TAB_ID = '__general__' as const

function pickSelectedProjectId(
  prev: string | null,
  projects: Project[],
  floors: Floor[]
): string {
  const projectIdsWithAgents = new Set<string>()
  const hasGeneralFloor = floors.some((f) => f.type === 'general')
  for (const f of floors) {
    if (f.type === 'project' && f.projectId && f.agents.length > 0) {
      projectIdsWithAgents.add(f.projectId)
    }
  }

  const prevOk =
    prev != null &&
    ((prev === GENERAL_FLOOR_TAB_ID && hasGeneralFloor) ||
      projectIdsWithAgents.has(prev))

  if (prevOk && prev != null) return prev

  if (hasGeneralFloor) return GENERAL_FLOOR_TAB_ID

  for (const p of projects) {
    if (projectIdsWithAgents.has(p.id)) return p.id
  }
  if (projects[0]) return projects[0].id
  return GENERAL_FLOOR_TAB_ID
}

function agentStatusToSprite(status: AgentStatus): SpriteState {
  switch (status) {
    case 'running': return 'running'
    case 'active': return 'active'
    case 'idle': return 'idle'
    case 'paused': return 'paused'
    case 'error': return 'error'
    case 'pending_approval': return 'pending_approval'
    case 'terminated': return 'terminated'
    default: return 'idle'
  }
}

function assignFloor(agent: Agent, projects: Project[]): string {
  const cLevelRoles = ['ceo', 'cto', 'cmo', 'cfo']
  if (cLevelRoles.includes(agent.role)) return 'executive'

  // Try to find a project this agent works on (via issues or reporting chain)
  // For now, place in 'general' â€” will be refined with issue assignment data
  if (projects.length > 0) return `project-${projects[0].id}`
  return 'general'
}

function computeFloors(agents: Agent[], projects: Project[]): Floor[] {
  const floors: Floor[] = []
  const cLevelRoles = ['ceo', 'cto', 'cmo', 'cfo']

  // Executive floor
  const execAgents = agents.filter(a => cLevelRoles.includes(a.role) && a.status !== 'terminated')
  floors.push({
    id: 'executive',
    type: 'executive',
    label: 'Executive Suite',
    projectId: null,
    agents: execAgents.map(a => a.id)
  })

  // Project floors
  for (const project of projects) {
    floors.push({
      id: `project-${project.id}`,
      type: 'project',
      label: project.name,
      projectId: project.id,
      agents: [] // Will be populated from issue assignments
    })
  }

  // General floor for unassigned agents
  const assignedIds = new Set(execAgents.map(a => a.id))
  const generalAgents = agents.filter(a =>
    !assignedIds.has(a.id) && a.status !== 'terminated'
  )
  floors.push({
    id: 'general',
    type: 'general',
    label: 'General Office',
    projectId: null,
    agents: generalAgents.map(a => a.id)
  })

  // Lobby
  floors.push({
    id: 'lobby',
    type: 'lobby',
    label: 'Lobby',
    projectId: null,
    agents: []
  })

  // Server room
  floors.push({
    id: 'server-room',
    type: 'server-room',
    label: 'Server Room',
    projectId: null,
    agents: []
  })

  return floors
}

export const useOfficeStore = create<OfficeStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    connectionStatus: 'disconnected',
    connectionError: null,
    company: null,
    agents: new Map(),
    projects: [],
    issues: new Map(),
    goals: [],
    approvals: [],
    costSummary: null,
    costByAgentModel: [],
    routines: [],
    plugins: [],
    floors: [],
    selectedProjectId: GENERAL_FLOOR_TAB_ID,
    activityLog: [],

    setConnectionStatus: (status, error) =>
      set({ connectionStatus: status, connectionError: error ?? null }),

    setCostByAgentModel: (rows) => set({ costByAgentModel: rows }),

    loadSnapshot: (snapshot) => {
      const agentMap = new Map<string, AgentWithOffice>()
      for (const agent of snapshot.agents) {
        agentMap.set(agent.id, {
          ...agent,
          office: {
            floorId: assignFloor(agent, snapshot.projects),
            spriteState: agentStatusToSprite(agent.status),
            currentTask: null,
            lastBubble: null
          }
        })
      }

      const issueMap = new Map<string, Issue>()
      for (const issue of snapshot.issues) {
        issueMap.set(issue.id, issue)

        // Assign agent to project floor based on issue assignment
        if (issue.assigneeAgentId && issue.projectId) {
          const agent = agentMap.get(issue.assigneeAgentId)
          if (agent && agent.office.floorId !== 'executive') {
            agent.office.floorId = `project-${issue.projectId}`
          }
        }
      }

      const floors = computeFloors(snapshot.agents, snapshot.projects)

      // Reassign agents to floors based on computed floorIds
      for (const [agentId, agent] of agentMap) {
        const floor = floors.find(f => f.id === agent.office.floorId)
        if (floor && !floor.agents.includes(agentId)) {
          floor.agents.push(agentId)
        }
      }

      const selectedProjectId = pickSelectedProjectId(
        get().selectedProjectId,
        snapshot.projects,
        floors
      )

      set({
        company: snapshot.company,
        agents: agentMap,
        projects: snapshot.projects,
        issues: issueMap,
        goals: snapshot.goals,
        approvals: snapshot.approvals,
        costSummary: snapshot.costSummary,
        costByAgentModel: snapshot.costByAgentModel ?? [],
        routines: snapshot.routines,
        plugins: snapshot.plugins,
        floors,
        selectedProjectId,
        activityLog: snapshot.activity.slice(0, MAX_ACTIVITY_LOG)
      })
    },

    handleEvent: (event) => {
      const state = get()

      switch (event.kind) {
        case 'agent:state-changed': {
          const agent = state.agents.get(event.agentId)
          if (!agent) break
          const updated = new Map(state.agents)
          updated.set(event.agentId, {
            ...agent,
            status: event.status,
            office: {
              ...agent.office,
              spriteState: agentStatusToSprite(event.status)
            }
          })
          set({ agents: updated })
          break
        }

        case 'heartbeat:started': {
          const agent = state.agents.get(event.agentId)
          if (!agent) break
          const updated = new Map(state.agents)
          updated.set(event.agentId, {
            ...agent,
            office: {
              ...agent.office,
              spriteState: 'typing',
              currentTask: event.issueId
                ? state.issues.get(event.issueId)?.title ?? 'Working...'
                : 'Working...'
            }
          })
          set({
            agents: updated,
            activityLog: prependEntry(state.activityLog, synthesizeEntry({
              kind: 'run-started',
              actorType: 'agent',
              action: 'Started run',
              entityType: 'run',
              entityId: event.runId,
              runId: event.runId,
              details: { agentName: agent.name, issueId: event.issueId }
            }))
          })
          break
        }

        case 'heartbeat:progress': {
          const agent = state.agents.get(event.agentId)
          if (!agent) break
          const updated = new Map(state.agents)
          updated.set(event.agentId, {
            ...agent,
            office: {
              ...agent.office,
              lastBubble: event.log.slice(0, 80)
            }
          })
          set({
            agents: updated,
            activityLog: prependEntry(state.activityLog, synthesizeEntry({
              kind: 'heartbeat-log',
              actorType: 'agent',
              action: event.log.slice(0, 120),
              entityType: 'heartbeat',
              entityId: event.runId,
              runId: event.runId,
              details: { agentName: agent.name, fullLog: event.log }
            }))
          })
          break
        }

        case 'heartbeat:completed': {
          const agent = state.agents.get(event.agentId)
          if (!agent) break
          const updated = new Map(state.agents)
          const isSuccess = event.status === 'succeeded'
          updated.set(event.agentId, {
            ...agent,
            office: {
              ...agent.office,
              spriteState: isSuccess ? 'celebrating' : 'error',
              currentTask: null,
              lastBubble: isSuccess ? 'Done!' : `Failed: ${event.status}`
            }
          })
          const runAction = isSuccess ? 'Run succeeded' : event.status === 'failed' ? 'Run failed' : `Run ${event.status}`
          set({
            agents: updated,
            activityLog: prependEntry(state.activityLog, synthesizeEntry({
              kind: 'run-completed',
              actorType: 'agent',
              action: runAction,
              entityType: 'run',
              entityId: event.runId,
              runId: event.runId,
              runStatus: event.status,
              details: { agentName: agent.name, status: event.status }
            }))
          })

          // Reset to idle after celebration
          if (isSuccess) {
            setTimeout(() => {
              const current = get().agents.get(event.agentId)
              if (current?.office.spriteState === 'celebrating') {
                const resetMap = new Map(get().agents)
                resetMap.set(event.agentId, {
                  ...current,
                  office: { ...current.office, spriteState: agentStatusToSprite(current.status), lastBubble: null }
                })
                set({ agents: resetMap })
              }
            }, 3000)
          }
          break
        }

        case 'issue:created': {
          const updated = new Map(state.issues)
          updated.set(event.issue.id, event.issue)
          set({ issues: updated })
          break
        }

        case 'issue:moved': {
          const issue = state.issues.get(event.issueId)
          if (!issue) break
          const updated = new Map(state.issues)
          updated.set(event.issueId, { ...issue, status: event.toStatus })
          set({ issues: updated })
          break
        }

        case 'issue:assigned': {
          const issue = state.issues.get(event.issueId)
          if (!issue) break
          const updated = new Map(state.issues)
          updated.set(event.issueId, { ...issue, assigneeAgentId: event.agentId })
          set({ issues: updated })
          break
        }

        case 'approval:created': {
          set({
            approvals: [...state.approvals, event.approval],
            activityLog: prependEntry(state.activityLog, synthesizeEntry({
              kind: 'approval-alert',
              actorType: 'system',
              action: `Approval needed: ${event.approval.type.replace(/_/g, ' ')}`,
              entityType: 'approval',
              entityId: event.approval.id,
              details: { type: event.approval.type, createdBy: event.approval.createdByAgentId }
            }))
          })
          break
        }

        case 'approval:decided': {
          set({
            approvals: state.approvals.map(a =>
              a.id === event.approvalId
                ? { ...a, status: event.decision === 'approved' ? 'approved' as const : 'rejected' as const }
                : a
            )
          })
          break
        }

        case 'cost:recorded': {
          const agent = state.agents.get(event.agentId)
          if (!agent) break
          const updated = new Map(state.agents)
          updated.set(event.agentId, {
            ...agent,
            spentMonthlyCents: agent.spentMonthlyCents + event.costCents
          })
          const dollars = `$${(event.costCents / 100).toFixed(2)}`
          const costAction = event.modelName ? `${dollars} (${event.modelName})` : dollars
          set({
            agents: updated,
            activityLog: prependEntry(state.activityLog, synthesizeEntry({
              kind: 'cost',
              actorType: 'agent',
              action: costAction,
              entityType: 'cost',
              entityId: event.agentId,
              costCents: event.costCents,
              modelName: event.modelName,
              details: { agentName: agent.name, costCents: event.costCents }
            }))
          })
          break
        }

        case 'plugin:status-changed': {
          set({
            plugins: state.plugins.map(p =>
              p.id === event.pluginId ? { ...p, status: event.status } : p
            )
          })
          break
        }

        case 'activity:logged': {
          set({ activityLog: prependEntry(state.activityLog, event.entry) })
          break
        }

        case 'project:created': {
          const newProjects = [...state.projects, event.project]
          const floors = computeFloors(
            Array.from(state.agents.values()),
            newProjects
          )
          set({ projects: newProjects, floors })
          break
        }

        default:
          break
      }
    },

    selectProject: (projectId) => set({ selectedProjectId: projectId }),

    reset: () =>
      set({
        connectionStatus: 'disconnected',
        connectionError: null,
        company: null,
        agents: new Map(),
        projects: [],
        issues: new Map(),
        goals: [],
        approvals: [],
        costSummary: null,
        costByAgentModel: [],
        routines: [],
        plugins: [],
        floors: [],
        selectedProjectId: GENERAL_FLOOR_TAB_ID,
        activityLog: []
      })
  }))
)

// Selectors
export const selectAgents = (s: OfficeStore) => s.agents
export const selectCompany = (s: OfficeStore) => s.company
export const selectFloors = (s: OfficeStore) => s.floors
export const selectActivityLog = (s: OfficeStore) => s.activityLog
export const selectConnectionStatus = (s: OfficeStore) => s.connectionStatus
export const selectProjects = (s: OfficeStore) => s.projects
export const selectSelectedProjectId = (s: OfficeStore) => s.selectedProjectId
export const selectSelectProject = (s: OfficeStore) => s.selectProject
export const selectApprovals = (s: OfficeStore) => s.approvals
export const selectCostSummary = (s: OfficeStore) => s.costSummary
export const selectCostByAgentModel = (s: OfficeStore) => s.costByAgentModel
export const selectGoals = (s: OfficeStore) => s.goals
export const selectIssues = (s: OfficeStore) => s.issues

