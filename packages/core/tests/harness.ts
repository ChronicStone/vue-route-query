import { createApp, effectScope } from 'vue'
import type { EffectScope } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

export interface Harness {
  router: Router
  /** Run composables with the app's injection context, inside a disposable scope. */
  run: <T>(fn: () => T) => T
  /** Dispose every scope created by `run`, like unmounting the components. */
  dispose: () => void
  /** Wait for queued writes to flush and the resulting navigation to settle. */
  settle: () => Promise<void>
}

export async function createHarness(initialUrl = '/'): Promise<Harness> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  })
  const app = createApp({ render: () => null })
  app.use(router)

  await router.push(initialUrl)
  await router.isReady()

  const scopes: EffectScope[] = []

  return {
    router,
    run(fn) {
      const scope = effectScope(true)
      scopes.push(scope)
      // SAFETY: the scope is active, so `run` always returns the callback's result.
      return app.runWithContext(() => scope.run(fn)) as ReturnType<typeof fn>
    },
    dispose() {
      for (const scope of scopes) {
        scope.stop()
      }
      scopes.length = 0
    },
    async settle() {
      // One macrotask is enough for the microtask flush and vue-router's async navigation.
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
  }
}
