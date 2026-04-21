import type { Company, Approval, Plugin } from '@shared/paperclip-types'
import type { AgentWithOffice, Floor } from '../../stores/officeStore'

interface SidebarProps {
  company: Company | null
  agents: Map<string, AgentWithOffice>
  floors: Floor[]
  approvals: Approval[]
  plugins: Plugin[]
}

const ROLE_COLORS: Record<string, string> = {
  ceo: 'var(--color-role-ceo)',
  cto: 'var(--color-role-cto)',
  cmo: 'var(--color-role-cmo)',
  cfo: 'var(--color-role-cfo)',
  engineer: 'var(--color-role-engineer)',
  designer: 'var(--color-role-designer)',
  pm: 'var(--color-role-pm)',
  qa: 'var(--color-role-qa)',
  devops: 'var(--color-role-devops)',
  researcher: 'var(--color-role-researcher)',
  general: 'var(--color-role-general)'
}

const FLOOR_TYPE_MAP: Record<string, string> = {
  executive: 'executive',
  project: 'project',
  general: 'general',
  lobby: 'lobby',
  'server-room': 'server-room'
}

export function Sidebar({ company, agents, floors, approvals, plugins }: SidebarProps): JSX.Element {
  const pendingApprovals = approvals.filter(a => a.status === 'pending')
  const activePlugins = plugins.filter(p => p.status === 'ready')

  return (
    <div className="sidebar">
      {/* Company header */}
      {company && (
        <div className="company-header">
          <div className="company-header__name">{company.name}</div>
          {company.description && (
            <div className="company-header__desc">{company.description}</div>
          )}
        </div>
      )}

      {/* Agents by floor */}
      <div className="panel-section" style={{ flex: 1, overflow: 'auto' }}>
        <div className="panel-section-title">
          Agents ({agents.size})
        </div>

        {floors
          .filter(f => f.agents.length > 0)
          .map(floor => (
            <div key={floor.id} style={{ marginBottom: 'var(--space-md)' }}>
              <div className={`floor-header floor-header--${FLOOR_TYPE_MAP[floor.type] || 'general'}`}>
                {floor.label}
              </div>

              {floor.agents.map(agentId => {
                const agent = agents.get(agentId)
                if (!agent) return null

                const roleColor = ROLE_COLORS[agent.role] || 'var(--color-text-dim)'
                return (
                  <div
                    key={agent.id}
                    className="agent-item"
                    style={{ '--agent-role-color': roleColor } as React.CSSProperties}
                  >
                    <span
                      className={`status-dot status-dot--${agent.status}`}
                      style={{ boxShadow: `0 0 6px ${roleColor}` }}
                    />
                    <span className="agent-item__name">{agent.name}</span>
                    <span
                      className="agent-item__role"
                      style={{ color: roleColor }}
                    >
                      {agent.role}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
      </div>

      {/* Pending approvals */}
      {pendingApprovals.length > 0 && (
        <div className="panel-section" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="panel-section-title">
            Pending Approvals ({pendingApprovals.length})
          </div>
          {pendingApprovals.map(a => (
            <div key={a.id} className="approval-item">
              {a.type.replace(/_/g, ' ')}
            </div>
          ))}
        </div>
      )}

      {/* Plugins */}
      {plugins.length > 0 && (
        <div className="panel-section" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="panel-section-title">
            Plugins ({activePlugins.length}/{plugins.length})
          </div>
          {plugins.map(p => {
            const pluginState = p.status === 'ready' ? 'ready' : p.status === 'error' ? 'error' : 'other'
            const dotClass = p.status === 'ready' ? 'active' : p.status === 'error' ? 'error' : 'terminated'
            return (
              <div key={p.id} className={`plugin-item plugin-item--${pluginState}`}>
                <span className={`status-dot status-dot--${dotClass}`} />
                <span className="plugin-item__name">{p.displayName}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
