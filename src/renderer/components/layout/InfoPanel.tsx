import { useState, useMemo } from 'react'
import {
  useOfficeStore,
  selectAgents,
  selectApprovals,
  selectCostByAgentModel,
  selectCostSummary,
  selectGoals,
  selectIssues
} from '../../stores/officeStore'
import type { AgentWithOffice } from '../../stores/officeStore'
import type {
  AgentStatus, Approval, BillingType,
  CostByAgentModelRow, Goal
} from '@shared/paperclip-types'
import { AgentCostDetailModal } from '../modals/AgentCostDetailModal'

// --- Collapsible Section shell ---

interface SectionProps {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}

function Section({ title, count, defaultOpen = true, children }: SectionProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="info-section">
      <button
        className="info-section__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="info-section__chevron" aria-hidden>{open ? '\u25BE' : '\u25B8'}</span>
        <span className="info-section__title">{title}</span>
        {count != null && <span className="info-section__count">{count}</span>}
      </button>
      {open && <div className="info-section__body">{children}</div>}
    </section>
  )
}

// --- Status helpers ---

const STATUS_DOT: Record<AgentStatus, string> = {
  running: 'status-dot--running',
  active: 'status-dot--active',
  idle: 'status-dot--active',
  paused: 'status-dot--paused',
  error: 'status-dot--error',
  pending_approval: 'status-dot--paused',
  terminated: 'status-dot--terminated'
}

function statusDescription(agent: AgentWithOffice): string {
  switch (agent.status) {
    case 'running': {
      const task = agent.office.currentTask
      return task ? `running \u00B7 ${task}` : 'running'
    }
    case 'error':
      return 'error'
    case 'paused':
      return agent.pauseReason ? `paused (${agent.pauseReason})` : 'paused'
    case 'pending_approval':
      return 'waiting for approval'
    case 'terminated':
      return 'terminated'
    default:
      return 'idle'
  }
}

function centsToStr(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function AgentsCostsSection(): JSX.Element {
  const agents = useOfficeStore(selectAgents)
  const costSummary = useOfficeStore(selectCostSummary)
  const costByAgentModel = useOfficeStore(selectCostByAgentModel)
  const [sortKey, setSortKey] = useState<CostSortKey>('cost')
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null)
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null)

  const sortedAgents = useMemo(() => {
    const list = Array.from(agents.values()).filter((a) => a.status !== 'terminated')
    const order: Record<string, number> = { running: 0, error: 1, pending_approval: 2, active: 3, idle: 4, paused: 5 }
    list.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
    return list
  }, [agents])

  const aggregates = useMemo(
    () => aggregateByAgent(costByAgentModel, agents),
    [costByAgentModel, agents]
  )

  const aggById = useMemo(() => {
    const m = new Map<string, AgentCostAggregate>()
    for (const a of aggregates) m.set(a.agentId, a)
    return m
  }, [aggregates])

  const maxSpendInList = useMemo(() => {
    let max = 0
    for (const agent of sortedAgents) {
      const agg = aggById.get(agent.id)
      if (!agg) continue
      const v = sortKey === 'cost' ? agg.costCents : agg.totalTokens
      if (v > max) max = v
    }
    return max > 0 ? max : 1
  }, [sortedAgents, aggById, sortKey])

  const totals = useMemo(() => {
    let cost = 0
    let tokens = 0
    for (const a of aggregates) {
      cost += a.costCents
      tokens += a.totalTokens
    }
    const summaryTotal = costSummary?.totalCostCents ?? 0
    return { cost: Math.max(cost, summaryTotal), tokens }
  }, [aggregates, costSummary])

  const detailAgent = detailAgentId
    ? aggregates.find((a) => a.agentId === detailAgentId)
    : null

  return (
    <Section title="Agents & spend" count={sortedAgents.length}>
      {aggregates.length > 0 && (
        <div className="cost-breakdown cost-breakdown--merged-head">
          <div className="cost-breakdown__summary">
            <div className="cost-breakdown__total">
              Total: <strong>{centsToStr(totals.cost)}</strong>
            </div>
            <div className="cost-breakdown__total cost-breakdown__total--tokens">
              <span>{formatCompact(totals.tokens)}</span> tokens
            </div>
          </div>
          <div className="cost-breakdown__toolbar" role="group" aria-label="Sort spend">
            <button
              type="button"
              className={`cost-sort-btn${sortKey === 'cost' ? ' cost-sort-btn--active' : ''}`}
              onClick={() => setSortKey('cost')}
              aria-pressed={sortKey === 'cost'}
            >
              Cost
            </button>
            <button
              type="button"
              className={`cost-sort-btn${sortKey === 'tokens' ? ' cost-sort-btn--active' : ''}`}
              onClick={() => setSortKey('tokens')}
              aria-pressed={sortKey === 'tokens'}
            >
              Tokens
            </button>
          </div>
        </div>
      )}
      {sortedAgents.length === 0 ? (
        <p className="info-empty">No agents connected</p>
      ) : (
        <ul className="agent-roster agent-roster--merged" role="list">
          {sortedAgents.map((agent) => {
            const agg = aggById.get(agent.id)
            const spendVal = agg ? (sortKey === 'cost' ? agg.costCents : agg.totalTokens) : 0
            const fillPct = agg && maxSpendInList > 0 ? (spendVal / maxSpendInList) * 100 : 0
            const expanded = expandedAgentId === agent.id
            return (
              <li key={agent.id} className="agent-roster__item">
                <div className="agent-roster__top">
                  <span className={`status-dot ${STATUS_DOT[agent.status] ?? ''}`} />
                  <span className="agent-roster__name">{agent.name}</span>
                  <span className={`agent-roster__role agent-roster__role--${agent.role}`}>{agent.role}</span>
                  {agg?.hasSubscription && (
                    <span className="billing-badge billing-badge--subscription_included">Sub</span>
                  )}
                </div>
                <div className="agent-roster__status">{statusDescription(agent)}</div>
                {agg && (
                  <div className="agent-cost-merge__spend">
                    <div className="cost-agent__bar-wrap">
                      <div className="cost-agent__bar" style={{ width: `${fillPct}%` }} />
                    </div>
                    <div className="agent-cost-merge__spend-meta">
                      <span className="cost-agent__money">
                        {agg.costCents > 0 ? centsToStr(agg.costCents) : 'Free'}
                      </span>
                      <span className="cost-agent__tokens">{formatCompact(agg.totalTokens)} tok</span>
                    </div>
                  </div>
                )}
                {agg && agg.models.length > 0 && (
                  <button
                    type="button"
                    className="agent-cost-merge__toggle"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedAgentId((curr) => (curr === agent.id ? null : agent.id))
                    }
                  >
                    <span className="agent-cost-merge__chev" aria-hidden>
                      {expanded ? '\u25BE' : '\u25B8'}
                    </span>
                    Models
                  </button>
                )}
                {expanded && agg && (
                  <ul className="cost-agent__models cost-agent__models--merged" role="list">
                    {agg.models.map((m, i) => {
                      const tokens = m.inputTokens + m.outputTokens
                      const isSub = isSubscriptionBilling(m.billingType)
                      return (
                        <li
                          key={`${m.provider}/${m.model}/${m.billingType}/${i}`}
                          className="cost-model"
                        >
                          <span
                            className={`provider-dot provider-dot--${m.provider.toLowerCase()}`}
                            title={m.provider}
                            aria-hidden
                          />
                          <span className="cost-model__name" title={m.model}>
                            {shortModel(m.model)}
                          </span>
                          <span className="cost-model__tokens">{formatCompact(tokens)}</span>
                          <span className="cost-model__money">
                            {isSub && m.costCents === 0 ? 'Inc' : centsToStr(m.costCents)}
                          </span>
                        </li>
                      )
                    })}
                    <li className="cost-agent__detail-row">
                      <button
                        className="cost-agent__detail-btn"
                        type="button"
                        onClick={() => setDetailAgentId(agent.id)}
                      >
                        View full breakdown {'\u2192'}
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {sortedAgents.length > 0 && aggregates.length === 0 && (
        <p className="info-empty info-empty--inline">No spend data yet</p>
      )}
      {detailAgent && (
        <AgentCostDetailModal
          agentId={detailAgent.agentId}
          agentName={detailAgent.agentName}
          rows={costByAgentModel}
          onClose={() => setDetailAgentId(null)}
        />
      )}
    </Section>
  )
}

// --- Dashboard Summary ---

function DashboardSummary(): JSX.Element {
  const agents = useOfficeStore(selectAgents)
  const issues = useOfficeStore(selectIssues)
  const approvals = useOfficeStore(selectApprovals)

  const stats = useMemo(() => {
    const agentArr = Array.from(agents.values())
    const issueArr = Array.from(issues.values())
    const agentCounts: Record<string, number> = { active: 0, running: 0, paused: 0, error: 0, idle: 0 }
    for (const a of agentArr) {
      if (a.status === 'terminated') continue
      agentCounts[a.status] = (agentCounts[a.status] ?? 0) + 1
    }

    const taskCounts: Record<string, number> = { open: 0, in_progress: 0, blocked: 0, done: 0 }
    for (const i of issueArr) {
      if (i.status === 'backlog' || i.status === 'todo') taskCounts.open++
      else if (i.status === 'in_progress' || i.status === 'in_review') taskCounts.in_progress++
      else if (i.status === 'blocked') taskCounts.blocked++
      else if (i.status === 'done') taskCounts.done++
    }

    const pendingApprovals = approvals.filter((a) => a.status === 'pending').length

    return { agentCounts, taskCounts, pendingApprovals }
  }, [agents, issues, approvals])

  return (
    <Section title="Dashboard">
      <div className="dashboard-grid">
        <div className="dashboard-group">
          <div className="dashboard-group__label">Agents</div>
          <div className="dashboard-group__stats">
            <span className="dashboard-stat dashboard-stat--active">{stats.agentCounts.active + stats.agentCounts.idle} active</span>
            <span className="dashboard-stat dashboard-stat--running">{stats.agentCounts.running} running</span>
            <span className="dashboard-stat dashboard-stat--paused">{stats.agentCounts.paused} paused</span>
            <span className="dashboard-stat dashboard-stat--error">{stats.agentCounts.error} error</span>
          </div>
        </div>

        <div className="dashboard-group">
          <div className="dashboard-group__label">Tasks</div>
          <div className="dashboard-group__stats">
            <span className="dashboard-stat">{stats.taskCounts.open} open</span>
            <span className="dashboard-stat dashboard-stat--running">{stats.taskCounts.in_progress} in prog</span>
            <span className="dashboard-stat dashboard-stat--error">{stats.taskCounts.blocked} blocked</span>
            <span className="dashboard-stat dashboard-stat--done">{stats.taskCounts.done} done</span>
          </div>
        </div>

        {stats.pendingApprovals > 0 && (
          <div className="dashboard-group dashboard-group--alert">
            <span className="dashboard-stat dashboard-stat--paused">{stats.pendingApprovals} pending approval{stats.pendingApprovals !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </Section>
  )
}

// --- Cost Breakdown ---

type CostSortKey = 'cost' | 'tokens'

interface AgentCostAggregate {
  agentId: string
  agentName: string
  costCents: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  models: CostByAgentModelRow[]
  hasSubscription: boolean
}

function formatCompact(n: number): string {
  if (n < 1_000) return `${n}`
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${(n / 1_000_000_000).toFixed(2)}B`
}

function isSubscriptionBilling(type: BillingType): boolean {
  return type === 'subscription_included' || type === 'subscription_overage'
}

function shortModel(model: string): string {
  // "alibaba/qwen3.5-plus" -> "qwen3.5-plus"; "claude-opus-4-6[1m]" -> unchanged
  const slash = model.lastIndexOf('/')
  return slash >= 0 ? model.slice(slash + 1) : model
}

function aggregateByAgent(
  rows: CostByAgentModelRow[],
  agents: Map<string, AgentWithOffice>
): AgentCostAggregate[] {
  const map = new Map<string, AgentCostAggregate>()
  for (const row of rows) {
    let agg = map.get(row.agentId)
    if (!agg) {
      agg = {
        agentId: row.agentId,
        agentName: row.agentName ?? agents.get(row.agentId)?.name ?? 'Unknown',
        costCents: 0,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        models: [],
        hasSubscription: false
      }
      map.set(row.agentId, agg)
    }
    agg.costCents += row.costCents
    agg.inputTokens += row.inputTokens
    agg.outputTokens += row.outputTokens
    agg.totalTokens += row.inputTokens + row.outputTokens
    agg.models.push(row)
    if (isSubscriptionBilling(row.billingType)) agg.hasSubscription = true
  }

  for (const agg of map.values()) {
    agg.models.sort((a, b) => {
      if (b.costCents !== a.costCents) return b.costCents - a.costCents
      return b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens)
    })
  }

  return Array.from(map.values())
}

// --- Pending Approvals ---

function approvalLabel(type: string): string {
  return type.replace(/_/g, ' ')
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 0 || isNaN(diff)) return ''
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function PendingApprovals(): JSX.Element {
  const approvals = useOfficeStore(selectApprovals)
  const agents = useOfficeStore(selectAgents)

  const pending = useMemo(
    () => approvals.filter((a): a is Approval & { status: 'pending' } => a.status === 'pending'),
    [approvals]
  )

  return (
    <Section title="Approvals" count={pending.length} defaultOpen={pending.length > 0}>
      {pending.length === 0 ? (
        <p className="info-empty">No pending approvals</p>
      ) : (
        <ul className="approval-list" role="list">
          {pending.map((a) => {
            const requester = a.createdByAgentId ? agents.get(a.createdByAgentId)?.name : null
            return (
              <li key={a.id} className="approval-card">
                <div className="approval-card__type">{approvalLabel(a.type)}</div>
                <div className="approval-card__meta">
                  {requester && <span>by {requester}</span>}
                  <span className="approval-card__time">{timeAgo(a.createdAt)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

// --- Goals Hierarchy ---

const GOAL_STATUS_ICON: Record<string, string> = {
  active: '\u25C9',
  planned: '\u25CB',
  achieved: '\u25CF',
  cancelled: '\u2715'
}

interface GoalNode {
  goal: Goal
  children: GoalNode[]
}

function buildGoalTree(goals: Goal[]): GoalNode[] {
  const map = new Map<string, GoalNode>()
  const roots: GoalNode[] = []

  for (const g of goals) {
    map.set(g.id, { goal: g, children: [] })
  }

  for (const node of map.values()) {
    if (node.goal.parentId && map.has(node.goal.parentId)) {
      map.get(node.goal.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

function GoalTreeItem({ node, depth }: { node: GoalNode; depth: number }): JSX.Element {
  const icon = GOAL_STATUS_ICON[node.goal.status] ?? '\u25CB'
  return (
    <>
      <li className="goal-item" style={{ paddingLeft: `${depth * 16}px` }}>
        <span className={`goal-item__icon goal-item__icon--${node.goal.status}`}>{icon}</span>
        <span className="goal-item__level">{node.goal.level}</span>
        <span className="goal-item__title">{node.goal.title}</span>
      </li>
      {node.children.map((child) => (
        <GoalTreeItem key={child.goal.id} node={child} depth={depth + 1} />
      ))}
    </>
  )
}

function GoalsHierarchy(): JSX.Element {
  const goals = useOfficeStore(selectGoals)
  const tree = useMemo(() => buildGoalTree(goals), [goals])

  return (
    <Section title="Goals" count={goals.length} defaultOpen={false}>
      {goals.length === 0 ? (
        <p className="info-empty">No goals defined</p>
      ) : (
        <ul className="goal-tree" role="tree">
          {tree.map((node) => (
            <GoalTreeItem key={node.goal.id} node={node} depth={0} />
          ))}
        </ul>
      )}
    </Section>
  )
}

// --- InfoPanel ---

export function InfoPanel(): JSX.Element {
  return (
    <aside className="info-panel" aria-label="Company information">
      <DashboardSummary />
      <AgentsCostsSection />
      <PendingApprovals />
      <GoalsHierarchy />
    </aside>
  )
}
