import type { Project } from '@shared/paperclip-types'
import { GENERAL_FLOOR_TAB_ID } from '../../stores/officeStore'

interface ProjectTabsProps {
  tabProjects: Project[]
  showGeneralTab: boolean
  selectedProjectId: string | null
  onSelect: (projectId: string) => void
  agentCounts: Map<string, number>
}

export function ProjectTabs({
  tabProjects,
  showGeneralTab,
  selectedProjectId,
  onSelect,
  agentCounts
}: ProjectTabsProps): JSX.Element {
  return (
    <div className="project-tabs">
      {showGeneralTab && (
        <button
          type="button"
          className={`project-tab ${selectedProjectId === GENERAL_FLOOR_TAB_ID ? 'project-tab--active' : ''}`}
          onClick={() => onSelect(GENERAL_FLOOR_TAB_ID)}
        >
          General
          <span className="project-tab__count">
            {agentCounts.get(GENERAL_FLOOR_TAB_ID) ?? 0}
          </span>
        </button>
      )}
      {tabProjects.map((p) => {
        const count = agentCounts.get(p.id) ?? 0
        return (
          <button
            key={p.id}
            type="button"
            className={`project-tab ${selectedProjectId === p.id ? 'project-tab--active' : ''}`}
            onClick={() => onSelect(p.id)}
          >
            {p.name}
            <span className="project-tab__count">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
