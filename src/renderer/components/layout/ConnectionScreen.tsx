import { useState } from 'react'
import { useOfficeStore, selectConnectionStatus } from '../../stores/officeStore'
import type { Company } from '@shared/paperclip-types'

export function ConnectionScreen(): JSX.Element {
  const connectionStatus = useOfficeStore(selectConnectionStatus)
  const connectionError = useOfficeStore(s => s.connectionError)

  const [url, setUrl] = useState('http://localhost:3100')
  const [apiKey, setApiKey] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [step, setStep] = useState<'connect' | 'select'>('connect')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)

    const result = await window.paperclip.connect(url, apiKey)
    if (!result.ok) {
      setError(result.error ?? 'Connection failed')
      setLoading(false)
      return
    }

    const companiesResult = await window.paperclip.fetchCompanies()
    setLoading(false)

    if (!companiesResult.ok || !companiesResult.data) {
      setError(companiesResult.error ?? 'Failed to fetch companies')
      return
    }

    setCompanies(companiesResult.data)
    setStep('select')
  }

  const handleSelectCompany = async (companyId: string) => {
    setLoading(true)
    setError(null)
    const result = await window.paperclip.selectCompany(companyId)
    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? 'Failed to load company')
    }
  }

  return (
    <div className="connect-screen">
      <div className="connect-card">
        <h1>Virtual Office</h1>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Connect to a Paperclip instance to visualize your AI company
        </p>

        {step === 'connect' ? (
          <>
            <label>
              Paperclip URL
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="http://localhost:3100"
              />
            </label>

            <label>
              API Key
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Optional for local_trusted mode"
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                Leave empty for local Paperclip instances (local_trusted mode)
              </span>
            </label>

            {(error || connectionError) && (
              <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>
                {error || connectionError}
              </p>
            )}

            <button
              className="btn-primary"
              onClick={handleConnect}
              disabled={loading || !url}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span className={`status-dot status-dot--${connectionStatus}`} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                Connected to {url}
              </span>
            </div>

            <p style={{ fontWeight: 500 }}>Select a company:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {companies.map(c => (
                <button
                  key={c.id}
                  className="btn-primary"
                  onClick={() => handleSelectCompany(c.id)}
                  disabled={loading}
                  style={{ textAlign: 'left' }}
                >
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  {c.description && (
                    <span style={{ opacity: 0.7, marginLeft: 'var(--space-sm)', fontSize: 'var(--text-sm)' }}>
                      {c.description}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {companies.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                No companies found on this instance.
              </p>
            )}

            {error && (
              <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>{error}</p>
            )}

            <button
              onClick={() => { setStep('connect'); setCompanies([]); window.paperclip.disconnect() }}
              style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}
