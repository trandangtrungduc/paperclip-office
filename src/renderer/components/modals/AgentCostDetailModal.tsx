import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { BillingType, CostByAgentModelRow } from '@shared/paperclip-types'

export interface AgentCostDetailModalProps {
  agentId: string
  agentName: string
  rows: CostByAgentModelRow[]
  onClose: () => void
}

function formatCompact(n: number): string {
  if (n < 1_000) return `${n}`
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${(n / 1_000_000_000).toFixed(2)}B`
}

function centsToStr(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function isSubscription(type: BillingType): boolean {
  return type === 'subscription_included' || type === 'subscription_overage'
}

function billingLabel(type: BillingType): string {
  switch (type) {
    case 'metered_api':
      return 'API'
    case 'subscription_included':
      return 'Sub'
    case 'subscription_overage':
      return 'Sub+'
    case 'credits':
      return 'Credits'
    case 'fixed':
      return 'Fixed'
    default:
      return '?'
  }
}

export function AgentCostDetailModal({
  agentId,
  agentName,
  rows,
  onClose
}: AgentCostDetailModalProps): JSX.Element | null {
  // ESC closes
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const agentRows = useMemo(
    () => rows.filter((r) => r.agentId === agentId).sort((a, b) => b.costCents - a.costCents),
    [rows, agentId]
  )

  const totals = useMemo(() => {
    let costCents = 0
    let input = 0
    let cached = 0
    let output = 0
    for (const r of agentRows) {
      costCents += r.costCents
      input += r.inputTokens
      cached += r.cachedInputTokens
      output += r.outputTokens
    }
    return { costCents, input, cached, output, total: input + output }
  }, [agentRows])

  const content = (
    <div className="cost-modal__scrim" onClick={onClose} role="presentation">
      <div
        className="cost-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cost-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cost-modal__header">
          <div>
            <div className="cost-modal__eyebrow">Cost breakdown</div>
            <h2 id="cost-modal-title" className="cost-modal__title">
              {agentName}
            </h2>
          </div>
          <button className="cost-modal__close" aria-label="Close" onClick={onClose}>
            {'\u2715'}
          </button>
        </header>

        <div className="cost-modal__summary">
          <div className="cost-modal__stat">
            <span className="cost-modal__stat-label">Total cost</span>
            <span className="cost-modal__stat-value cost-modal__stat-value--money">
              {centsToStr(totals.costCents)}
            </span>
          </div>
          <div className="cost-modal__stat">
            <span className="cost-modal__stat-label">Tokens</span>
            <span className="cost-modal__stat-value">{formatCompact(totals.total)}</span>
          </div>
          <div className="cost-modal__stat">
            <span className="cost-modal__stat-label">Input</span>
            <span className="cost-modal__stat-value">{formatCompact(totals.input)}</span>
          </div>
          <div className="cost-modal__stat">
            <span className="cost-modal__stat-label">Output</span>
            <span className="cost-modal__stat-value">{formatCompact(totals.output)}</span>
          </div>
          {totals.cached > 0 && (
            <div className="cost-modal__stat">
              <span className="cost-modal__stat-label">Cached</span>
              <span className="cost-modal__stat-value">{formatCompact(totals.cached)}</span>
            </div>
          )}
        </div>

        <div className="cost-modal__body">
          {agentRows.length === 0 ? (
            <p className="cost-modal__empty">No model usage recorded yet.</p>
          ) : (
            <table className="cost-modal__table">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Billing</th>
                  <th scope="col" className="cost-modal__num">
                    Input
                  </th>
                  <th scope="col" className="cost-modal__num">
                    Output
                  </th>
                  <th scope="col" className="cost-modal__num">
                    Cached
                  </th>
                  <th scope="col" className="cost-modal__num">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {agentRows.map((r, i) => (
                  <tr key={`${r.provider}/${r.biller}/${r.model}/${r.billingType}/${i}`}>
                    <td className="cost-modal__model">{r.model}</td>
                    <td>
                      <span
                        className={`provider-dot provider-dot--${r.provider.toLowerCase()}`}
                        aria-hidden
                      />
                      {r.provider}
                    </td>
                    <td>
                      <span className={`billing-badge billing-badge--${r.billingType}`}>
                        {billingLabel(r.billingType)}
                      </span>
                    </td>
                    <td className="cost-modal__num">{formatCompact(r.inputTokens)}</td>
                    <td className="cost-modal__num">{formatCompact(r.outputTokens)}</td>
                    <td className="cost-modal__num">
                      {r.cachedInputTokens > 0 ? formatCompact(r.cachedInputTokens) : '\u2014'}
                    </td>
                    <td className="cost-modal__num cost-modal__num--money">
                      {isSubscription(r.billingType) && r.costCents === 0
                        ? 'Included'
                        : centsToStr(r.costCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
