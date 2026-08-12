/// <reference types="vite/client" />

declare global {
  interface Window {
    api: import('../electron/preload').TchikongApi
  }
}

export {}
