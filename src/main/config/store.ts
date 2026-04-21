import ElectronStore from 'electron-store'

interface ConfigSchema {
  lastConnection?: { url: string }
  lastCompanyId?: string
  windowState: {
    width: number
    height: number
    x?: number
    y?: number
  }
  preferences: Record<string, unknown>
}

type StoreCtor = new <T extends Record<string, unknown> = Record<string, unknown>>(
  options?: ConstructorParameters<typeof ElectronStore>[0]
) => ElectronStore<T>

const Store = (ElectronStore as unknown as { default?: StoreCtor }).default
  ?? (ElectronStore as unknown as StoreCtor)

export const configStore = new Store<ConfigSchema>({
  name: 'paperclip-office-config',
  defaults: {
    windowState: {
      width: 1400,
      height: 900
    },
    preferences: {}
  }
})
