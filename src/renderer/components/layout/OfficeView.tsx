import { useMemo, useState } from 'react'
import {
  useOfficeStore,
  selectAgents,
  selectFloors,
  selectActivityLog,
  selectProjects,
  selectSelectedProjectId,
  selectSelectProject,
  GENERAL_FLOOR_TAB_ID
} from '../../stores/officeStore'
import { ActivityFeed } from './ActivityFeed'
import { InfoPanel } from './InfoPanel'
import { ProjectTabs } from './ProjectTabs'
import { OfficeCanvas } from '../game/OfficeCanvas'
import type { AgentWithOffice, Floor, SpriteState } from '../../stores/officeStore'
import type { AgentRole, AgentStatus } from '@shared/paperclip-types'

export function OfficeView(): JSX.Element {
  const agents = useOfficeStore(selectAgents)
  const allFloors = useOfficeStore(selectFloors)
  const projects = useOfficeStore(selectProjects)
  const activityLog = useOfficeStore(selectActivityLog)
  const selectedProjectId = useOfficeStore(selectSelectedProjectId)
  const selectProject = useOfficeStore(selectSelectProject)

  const [showAnimationMock, setShowAnimationMock] = useState(false)

  const agentCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const floor of allFloors) {
      if (floor.projectId && floor.agents.length > 0) {
        counts.set(floor.projectId, floor.agents.length)
      }
    }
    const generalFloor = allFloors.find(f => f.type === 'general')
    if (generalFloor && generalFloor.agents.length > 0) {
      counts.set(GENERAL_FLOOR_TAB_ID, generalFloor.agents.length)
    }
    return counts
  }, [allFloors])

  const tabProjects = useMemo(() => {
    const withAgents = projects.filter(p => (agentCounts.get(p.id) ?? 0) > 0)
    if (withAgents.length > 0) return withAgents
    if (projects.length > 0) return [projects[0]]
    return []
  }, [projects, agentCounts])

  const filteredFloors: Floor[] = useMemo(() => {
    if (selectedProjectId == null) return []
    if (selectedProjectId === GENERAL_FLOOR_TAB_ID) {
      return allFloors.filter(
        f =>
          f.type === 'general' ||
          (f.type === 'executive' && f.agents.length > 0)
      )
    }
    return allFloors.filter(
      f =>
        f.projectId === selectedProjectId ||
        (f.type === 'executive' && f.agents.length > 0)
    )
  }, [allFloors, selectedProjectId])

  const animationMock = useMemo(() => {
    const now = new Date().toISOString()
    const companyId = 'mock-company'
    const mkAgent = (
      id: string,
      name: string,
      role: AgentRole,
      status: AgentStatus,
      spriteState: SpriteState
    ): AgentWithOffice => ({
      id,
      companyId,
      name,
      role,
      title: null,
      icon: null,
      status,
      reportsTo: null,
      adapterType: 'mock',
      budgetMonthlyCents: 100_00,
      spentMonthlyCents: 25_00,
      pauseReason: status === 'paused' ? 'manual' : null,
      lastHeartbeatAt: now,
      capabilities: ['mock-animation'],
      createdAt: now,
      updatedAt: now,
      office: {
        floorId: role === 'ceo' || role === 'cto' ? 'executive' : 'general',
        spriteState,
        currentTask: status === 'running' ? 'Mock run' : null,
        lastBubble: null
      }
    })

    const rows: AgentWithOffice[] = [
      mkAgent('mock-ceo', 'CEO (running)', 'ceo', 'running', 'running'),
      mkAgent('mock-cto', 'CTO (active)', 'cto', 'active', 'active'),
      mkAgent('mock-pm', 'PM (idle)', 'pm', 'idle', 'idle'),
      mkAgent('mock-eng', 'Engineer (paused)', 'engineer', 'paused', 'paused'),
      mkAgent('mock-qa', 'QA (error)', 'qa', 'error', 'error'),
      mkAgent('mock-cfo', 'CFO (approval)', 'cfo', 'pending_approval', 'pending_approval'),
      mkAgent('mock-devops', 'DevOps (terminated)', 'devops', 'terminated', 'terminated'),
      mkAgent('mock-designer', 'Designer (celebrate)', 'designer', 'active', 'celebrating'),
      mkAgent('mock-research', 'Researcher (sleeping)', 'researcher', 'idle', 'sleeping')
    ]
    const map = new Map(rows.map((a) => [a.id, a]))
    const floors: Floor[] = [
      {
        id: 'executive',
        type: 'executive',
        label: 'Executive Suite',
        projectId: null,
        agents: rows.filter((a) => a.office.floorId === 'executive').map((a) => a.id)
      },
      {
        id: 'general',
        type: 'general',
        label: 'General Office',
        projectId: null,
        agents: rows.filter((a) => a.office.floorId === 'general').map((a) => a.id)
      }
    ]
    return { agents: map, floors }
  }, [])

  const canvasAgents = showAnimationMock ? animationMock.agents : agents
  const canvasFloors = showAnimationMock ? animationMock.floors : filteredFloors

  const shellClass = 'app-shell'

  return (
    <div className={`${shellClass} app-shell--no-statusbar`}>
      <InfoPanel />

      <div className="canvas-area" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="canvas-area__toolbar">
          <ProjectTabs
            tabProjects={tabProjects}
            showGeneralTab={true}
            selectedProjectId={selectedProjectId}
            onSelect={selectProject}
            agentCounts={agentCounts}
          />
          <button
            className={`panel-toggle-btn${showAnimationMock ? ' panel-toggle-btn--active' : ''}`}
            onClick={() => setShowAnimationMock((v) => !v)}
            title={showAnimationMock ? 'Disable animation mock' : 'Enable animation mock'}
            aria-label="Toggle animation mock data"
          >
            {showAnimationMock ? 'Disable' : 'Enable'} Anim Mock
          </button>
        </div>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <OfficeCanvas agents={canvasAgents} floors={canvasFloors} projects={projects} />
        </div>
      </div>

      <ActivityFeed entries={activityLog} />
    </div>
  )
}
