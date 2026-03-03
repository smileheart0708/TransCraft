import type { App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'

export function registerAppProviders(app: VueApp<Element>): void {
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)
}
