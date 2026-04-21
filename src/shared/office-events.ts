// Normalized office events — transformed from raw Paperclip events
// These are the events that flow from main process to renderer via IPC

import type {
  Agent, Issue, Approval, ActivityEntry,
  AgentStatus, IssueStatus, HeartbeatRunStatus, PluginStatus, Project
} from './paperclip-types'

export type NormalizedOfficeEvent =
  | AgentArrivedEvent
  | AgentStateChangedEvent
  | AgentDepartedEvent
  | AgentUpdatedEvent
  | HeartbeatStartedEvent
  | HeartbeatProgressEvent
  | HeartbeatCompletedEvent
  | IssueCreatedEvent
  | IssueMovedEvent
  | IssueAssignedEvent
  | ApprovalCreatedEvent
  | ApprovalDecidedEvent
  | CostRecordedEvent
  | PluginStatusChangedEvent
  | ActivityLoggedEvent
  | CompanyUpdatedEvent
  | ProjectCreatedEvent
  | RoutineTriggeredEvent

interface BaseEvent {
  timestamp: string
}

export interface AgentArrivedEvent extends BaseEvent {
  kind: 'agent:arrived'
  agent: Agent
}

export interface AgentStateChangedEvent extends BaseEvent {
  kind: 'agent:state-changed'
  agentId: string
  status: AgentStatus
  previousStatus?: AgentStatus
}

export interface AgentDepartedEvent extends BaseEvent {
  kind: 'agent:departed'
  agentId: string
}

export interface AgentUpdatedEvent extends BaseEvent {
  kind: 'agent:updated'
  agentId: string
  changes: Partial<Agent>
}

export interface HeartbeatStartedEvent extends BaseEvent {
  kind: 'heartbeat:started'
  agentId: string
  runId: string
  issueId?: string
}

export interface HeartbeatProgressEvent extends BaseEvent {
  kind: 'heartbeat:progress'
  agentId: string
  runId: string
  log: string
}

export interface HeartbeatCompletedEvent extends BaseEvent {
  kind: 'heartbeat:completed'
  agentId: string
  runId: string
  status: HeartbeatRunStatus
}

export interface IssueCreatedEvent extends BaseEvent {
  kind: 'issue:created'
  issue: Issue
}

export interface IssueMovedEvent extends BaseEvent {
  kind: 'issue:moved'
  issueId: string
  fromStatus: IssueStatus
  toStatus: IssueStatus
}

export interface IssueAssignedEvent extends BaseEvent {
  kind: 'issue:assigned'
  issueId: string
  agentId: string
}

export interface ApprovalCreatedEvent extends BaseEvent {
  kind: 'approval:created'
  approval: Approval
}

export interface ApprovalDecidedEvent extends BaseEvent {
  kind: 'approval:decided'
  approvalId: string
  decision: 'approved' | 'rejected' | 'revision_requested'
}

export interface CostRecordedEvent extends BaseEvent {
  kind: 'cost:recorded'
  agentId: string
  costCents: number
  modelName?: string
}

export interface PluginStatusChangedEvent extends BaseEvent {
  kind: 'plugin:status-changed'
  pluginId: string
  status: PluginStatus
}

export interface ActivityLoggedEvent extends BaseEvent {
  kind: 'activity:logged'
  entry: ActivityEntry
}

export interface CompanyUpdatedEvent extends BaseEvent {
  kind: 'company:updated'
  changes: Record<string, unknown>
}

export interface ProjectCreatedEvent extends BaseEvent {
  kind: 'project:created'
  project: Project
}

export interface RoutineTriggeredEvent extends BaseEvent {
  kind: 'routine:triggered'
  routineId: string
  agentId: string
}

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionStatusPayload {
  status: ConnectionStatus
  error?: string
}
