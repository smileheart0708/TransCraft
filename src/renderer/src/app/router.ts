import { createMemoryHistory, createRouter } from 'vue-router'
import WorkspaceView from '@renderer/views/WorkspaceView.vue'

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      name: 'workspace',
      component: WorkspaceView
    }
  ]
})
