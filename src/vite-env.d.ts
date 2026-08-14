/// <reference types="vite/client" />

type TchikongApi = import('../../electron/preload/index').TchikongApi

declare global {
  interface Window {
    api: TchikongApi
  }
}

export {}
