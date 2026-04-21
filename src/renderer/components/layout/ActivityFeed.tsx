import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import type { ActivityEntry } from '@shared/paperclip-types'

interface ActivityFeedProps {
  entries: ActivityEntry[]
}

type FilterKind = 'all' | 'agents' | 'issues' | 'approvals'

const FILTERS: { key: FilterKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'agents', label: 'Agents' },
  { key: 'issues', label: 'Issues' },
  { key: 'approvals', label: 'Approvals' }
]

const FILTER_MATCHERS: Record<FilterKind, (e: ActivityEntry) => boolean> = {
  all: () => true,
  agents: (e) =>
    e.kind === 'run-started' ||
    e.kind === 'run-completed' ||
    e.kind === 'heartbeat-log' ||
    e.entityType === 'agent',
  issues: (e) => e.entityType === 'issue' || e.entityType.includes('issue'),
  approvals: (e) => e.kind === 'approval-alert' || e.entityType.includes('approval')
}

function entryKind(entry: ActivityEntry): string {
  if (entry.kind && entry.kind !== 'activity') return entry.kind
  const t = entry.entityType.toLowerCase()
  if (t.includes('approval')) return 'approval'
  if (t.includes('issue')) return 'issue'
  if (t.includes('goal')) return 'goal'
  if (t.includes('project')) return 'project'
  if (t.includes('agent')) return 'agent'
  return 'default'
}

function actorLabel(entry: ActivityEntry): string {
  if (entry.actorType === 'agent') {
    const name = entry.details?.agentName
    return typeof name === 'string' && name.length > 0 ? name : 'Agent'
  }
  if (entry.actorType === 'user') return 'Board'
  return 'System'
}

function entryGlyph(kind: string): string {
  switch (kind) {
    case 'cost': return '$'
    case 'heartbeat-log': return '>'
    case 'run-started': return '\u25B6'
    case 'run-completed': return '\u25A0'
    case 'approval-alert': return '\u26A0'
    case 'approval': return '\u2713'
    case 'issue': return '\u25C6'
    case 'goal': return '\u25CE'
    case 'project': return '\u25A4'
    case 'agent': return '\u25C7'
    default: return '\u2022'
  }
}

function formatTime(dateStr: string): string {
  const d = parseISO(dateStr)
  return isValid(d) ? format(d, 'HH:mm:ss') : '--:--:--'
}

function runStatusModifier(entry: ActivityEntry): string {
  if (entry.kind !== 'run-completed' || !entry.runStatus) return ''
  if (entry.runStatus === 'succeeded') return ' activity-item--run-succeeded'
  if (entry.runStatus === 'failed' || entry.runStatus === 'timed_out') return ' activity-item--run-failed'
  return ''
}

const SCROLL_THRESHOLD = 30

export function ActivityFeed({ entries }: ActivityFeedProps): JSX.Element {
  const [activeFilter, setActiveFilter] = useState<FilterKind>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => entries.filter(FILTER_MATCHERS[activeFilter]),
    [entries, activeFilter]
  )

  // Reverse so newest entries appear at bottom (natural for auto-scroll)
  const displayEntries = useMemo(() => [...filtered].reverse(), [filtered])

  const n = entries.length
  const fn = filtered.length

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && bodyRef.current) {
      bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [displayEntries, autoScroll])

  const handleScroll = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
    if (!atBottom && autoScroll) setAutoScroll(false)
  }, [autoScroll])

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <aside className="activity-panel" aria-label="Activity feed">
      <header className="activity-panel__header">
        <span className="activity-panel__pulse" aria-hidden />
        <div className="activity-panel__header-text">
          <h2 className="activity-panel__title">Activity</h2>
          <p className="activity-panel__subtitle">
            {n === 0
              ? 'Waiting for events'
              : activeFilter === 'all'
                ? `${n} in buffer`
                : `${fn} of ${n}`}
          </p>
        </div>
        <button
          className={`activity-panel__autoscroll-btn${autoScroll ? ' activity-panel__autoscroll-btn--active' : ''}`}
          onClick={() => {
            setAutoScroll(true)
            bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
          }}
          title={autoScroll ? 'Auto-scroll on' : 'Click to pin to bottom'}
        >
          <span aria-hidden>{'\u2193'}</span> Auto
        </button>
      </header>

      <nav className="activity-filters" aria-label="Filter activity entries">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`activity-filters__btn${activeFilter === f.key ? ' activity-filters__btn--active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <div className="activity-panel__body" ref={bodyRef} onScroll={handleScroll}>
        {fn === 0 ? (
          <div className="activity-empty">
            {n === 0
              ? 'No activity yet. Events will appear here in real-time.'
              : 'No matching entries for this filter.'}
          </div>
        ) : (
          <ul className="activity-feed-list" role="list">
            {displayEntries.map((entry) => {
              const kind = entryKind(entry)
              const isExpanded = expandedId === entry.id
              const warningClass = entry.kind === 'approval-alert' ? ' activity-item--warning' : ''
              const statusClass = runStatusModifier(entry)
              return (
                <li
                  key={entry.id}
                  className={`activity-item activity-item--actor-${entry.actorType} activity-item--kind-${kind}${warningClass}${statusClass}${isExpanded ? ' activity-item--expanded' : ''}`}
                  onClick={() => toggleExpand(entry.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(entry.id) }}
                >
                  <div className="activity-item__glyph" aria-hidden>
                    {entryGlyph(kind)}
                  </div>
                  <div className="activity-item__main">
                    <div className="activity-item__meta">
                      <time className="activity-item__time" dateTime={entry.createdAt}>
                        {formatTime(entry.createdAt)}
                      </time>
                      <span className={`activity-item__actor activity-item__actor--${entry.actorType}`}>
                        {actorLabel(entry)}
                      </span>
                    </div>
                    <div className="activity-item__text">
                      <span className="activity-item__action">{entry.action}</span>
                      {entry.kind !== 'heartbeat-log' && (
                        <>
                          <span className="activity-item__sep">{'\u00B7'}</span>
                          <span className="activity-item__entity">{entry.entityType}</span>
                        </>
                      )}
                    </div>
                    {isExpanded && Object.keys(entry.details).length > 0 && (
                      <div className="activity-item__detail">
                        <pre className="activity-item__detail-json">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
