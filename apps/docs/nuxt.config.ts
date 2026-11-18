import { fileURLToPath } from 'node:url'

const twoslashLineEnd = fileURLToPath(new URL('./mdc/twoslash-newline.config.ts', import.meta.url))

export default defineNuxtConfig({
  extends: ['./layer'],
  vue: {
    runtimeCompiler: true,
  },
  hooks: {
    // Runs before nuxt-content-twoslash's own MDC config, so its transformer goes first.
    'mdc:configSources'(sources: string[]) {
      if (!sources.includes(twoslashLineEnd)) {
        sources.unshift(twoslashLineEnd)
      }
    },
  },
})
