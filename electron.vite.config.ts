import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const toPosixPath = (id: string): string => id.replace(/\\/g, '/')

const manualChunks = (id: string): string | undefined => {
  const normalized = toPosixPath(id)
  if (!normalized.includes('/node_modules/')) return undefined

  if (
    normalized.includes('/node_modules/@codemirror/') ||
    normalized.includes('/node_modules/codemirror/')
  ) {
    return 'vendor-codemirror'
  }

  if (
    normalized.includes('/node_modules/vue/') ||
    normalized.includes('/node_modules/@vue/') ||
    normalized.includes('/node_modules/pinia/') ||
    normalized.includes('/node_modules/vue-router/')
  ) {
    return 'vendor-vue'
  }

  if (normalized.includes('/node_modules/lucide-vue-next/')) {
    return 'vendor-icons'
  }

  return 'vendor'
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    main: {
      build: {
        target: 'node24',
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction
      }
    },
    preload: {
      build: {
        target: 'node24',
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction
      }
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@resources': resolve('resources')
        }
      },
      plugins: [vue(), tailwindcss()],
      build: {
        target: 'chrome144',
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction,
        modulePreload: {
          polyfill: false
        },
        rollupOptions: {
          output: {
            manualChunks
          }
        }
      }
    }
  }
})
