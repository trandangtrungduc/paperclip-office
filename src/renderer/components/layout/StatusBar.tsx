import type { Company } from '@shared/paperclip-types'
import type { ConnectionStatus } from '@shared/office-events'

interface StatusBarProps {
  connectionStatus: ConnectionStatus
  company: Company | null
  agentCount: number
}

export function StatusBar({ connectionStatus, company, agentCount }: StatusBarProps): JSX.Element {
  return (
    <div className="statusbar">
      <span className={`status-dot status-dot--${connectionStatus}`} />
      <span>{connectionStatus === 'connected' ? 'Connected' : connectionStatus}</span>

      {company && (
        <>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span>{company.name}</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
        </>
      )}

      <span style={{ flex: 1 }} />
      <span>Virtual Office v0.1.0</span>
    </div>
  )
}
