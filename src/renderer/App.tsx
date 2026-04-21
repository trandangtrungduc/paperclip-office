import { useIpcEvents } from './hooks/useIpcEvents'
import { useOfficeStore, selectConnectionStatus, selectCompany } from './stores/officeStore'
import { ConnectionScreen } from './components/layout/ConnectionScreen'
import { OfficeView } from './components/layout/OfficeView'

export function App(): JSX.Element {
  useIpcEvents()

  const connectionStatus = useOfficeStore(selectConnectionStatus)
  const company = useOfficeStore(selectCompany)

  if (!company || connectionStatus === 'disconnected') {
    return <ConnectionScreen />
  }

  return <OfficeView />
}
