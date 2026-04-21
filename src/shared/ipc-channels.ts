// IPC channel constants — single source of truth for main↔renderer communication

export const IPC = {
  // Main → Renderer
  CONNECTION_STATUS: 'paperclip:connection-status',
  STATE_SNAPSHOT: 'paperclip:state-snapshot',
  EVENT: 'paperclip:event',
  COMPANIES_LIST: 'paperclip:companies-list',
  COST_BREAKDOWN_UPDATE: 'paperclip:cost-breakdown-update',
  ERROR: 'paperclip:error',

  // Renderer → Main
  CONNECT: 'paperclip:connect',
  DISCONNECT: 'paperclip:disconnect',
  SELECT_COMPANY: 'paperclip:select-company',
  FETCH_COMPANIES: 'paperclip:fetch-companies',
  REFRESH: 'paperclip:refresh',

  // Window management
  MINIMIZE_TO_TRAY: 'app:minimize-to-tray',
  SET_ALWAYS_ON_TOP: 'app:set-always-on-top',

  // Preferences
  GET_PREFERENCES: 'app:get-preferences',
  SET_PREFERENCES: 'app:set-preferences',
  PREFERENCES_CHANGED: 'app:preferences-changed'
} as const
