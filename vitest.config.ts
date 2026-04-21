import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/main/paperclip/event-normalizer.ts',
        'src/main/paperclip/client.ts',
        'src/main/paperclip/websocket.ts',
        'src/shared/ipc-channels.ts',
        'src/renderer/stores/officeStore.ts',
        'src/renderer/components/game/deskSideCabinetLayout.ts'
      ],
      reporter: ['text', 'json-summary']
    }
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer')
    }
  }
})
