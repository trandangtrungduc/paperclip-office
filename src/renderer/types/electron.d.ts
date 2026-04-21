import type { PaperclipAPI } from '../../preload/index'

declare global {
  interface Window {
    paperclip: PaperclipAPI
  }
}
