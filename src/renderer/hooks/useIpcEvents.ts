import { useEffect } from 'react'
import { useOfficeStore } from '../stores/officeStore'

/**
 * Subscribe to IPC events from main process and dispatch to store.
 */
export function useIpcEvents(): void {
  const setConnectionStatus = useOfficeStore(s => s.setConnectionStatus)
  const loadSnapshot = useOfficeStore(s => s.loadSnapshot)
  const setCostByAgentModel = useOfficeStore(s => s.setCostByAgentModel)
  const handleEvent = useOfficeStore(s => s.handleEvent)

  useEffect(() => {
    const unsubStatus = window.paperclip.onConnectionStatus((payload) => {
      setConnectionStatus(payload.status, payload.error)
    })

    const unsubSnapshot = window.paperclip.onStateSnapshot((snapshot) => {
      loadSnapshot(snapshot)
    })

    const unsubEvent = window.paperclip.onEvent((event) => {
      handleEvent(event)
    })

    const unsubCostBreakdown = window.paperclip.onCostBreakdownUpdate((rows) => {
      setCostByAgentModel(rows)
    })

    return () => {
      unsubStatus()
      unsubSnapshot()
      unsubEvent()
      unsubCostBreakdown()
    }
  }, [setConnectionStatus, loadSnapshot, setCostByAgentModel, handleEvent])
}
