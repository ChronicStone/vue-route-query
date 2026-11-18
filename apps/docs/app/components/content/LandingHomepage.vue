<script setup lang="ts">
const features = [
  {
    icon: 'i-pixelarticons-shield',
    title: 'Rules on every key',
    body: 'min, max, int, lengths, patterns, enums. A value that breaks a rule falls back to the default, or is clamped when you ask.',
    sample: 'numberCodec({ default: 1, min: 1 })',
  },
  {
    icon: 'i-pixelarticons-folder',
    title: 'Grouped keys',
    body: 'Several keys behind one object, under a prefix, written together.',
    sample: '?users.page=2&users.size=50',
  },
  {
    icon: 'i-pixelarticons-link',
    title: 'Cross-field rules',
    body: 'Name a rule, the keys it reads, and the keys it rejects. from <= to, min <= max.',
    sample: "reject: ['salaryMax']",
  },
  {
    icon: 'i-pixelarticons-sliders',
    title: 'Keys from your data',
    body: 'Filters a user builds at runtime get their own keys with dynamicQueryState.',
    sample: '?f.fields.salary~gte=60000',
  },
]

const apiSurface = [
  {
    name: 'useQueryState',
    hint: 'one key, one ref',
    code: `import { numberCodec, useQueryState } from '@chronicstone/vue-route-query'
// ---cut---
const page = useQueryState(
  'page',
  numberCodec({ default: 1, int: true, min: 1 }),
)

page.value++ // ?page=2`,
  },
  {
    name: 'useQueryStates',
    hint: 'several keys, one object',
    code: `import { numberCodec, useQueryStates } from '@chronicstone/vue-route-query'
// ---cut---
const salary = useQueryStates({
  schema: {
    min: numberCodec({ min: 0 }),
    max: numberCodec({ min: 0 }),
  },
  rules: {
    range: {
      keys: ['min', 'max'],
      check: ({ min, max }) => min <= max,
      reject: ['max'],
    },
  },
})`,
  },
  {
    name: 'schemaCodec',
    hint: 'an object in one key',
    code: `import { schemaCodec, useQueryState } from '@chronicstone/vue-route-query'
import { z } from 'zod'
// ---cut---
const sort = useQueryState(
  'sort',
  schemaCodec(
    z.object({
      key: z.string(),
      direction: z.enum(['asc', 'desc']),
    }),
    { default: { key: 'name', direction: 'asc' } },
  ),
)
// ?sort={"key":"date","direction":"desc"}`,
  },
]

// Grey pixels are ref writes, the green one under them is the navigation they share.
const tickColumns = 18

const copied = ref(false)
async function copyInstall() {
  try {
    await navigator.clipboard.writeText('npm i @chronicstone/vue-route-query')
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="landing">
    <div class="landing-frame">
      <!-- Hero -->
      <section class="landing-hero">
        <div class="landing-hero-copy vrq-grid-bg">
          <h1 class="landing-title font-pixel">
            ref(),<br />but in the <span class="text-primary">URL</span>.
          </h1>
          <p class="landing-lead">
            Typed query-string state for Vue and vue-router. Edit the URL in the console, or the
            controls under it.
          </p>
          <div class="flex flex-wrap">
            <NuxtLink to="/getting-started/introduction" class="landing-btn is-primary">
              Get started
              <UIcon name="i-pixelarticons-arrow-right" class="size-4" />
            </NuxtLink>
            <NuxtLink
              to="https://github.com/ChronicStone/vue-route-query"
              target="_blank"
              class="landing-btn"
            >
              <UIcon name="i-pixelarticons-github" class="size-4" />
              GitHub
            </NuxtLink>
          </div>
          <button type="button" class="landing-install" @click="copyInstall">
            <span class="min-w-0 truncate"
              ><span class="text-primary">$</span> npm i @chronicstone/vue-route-query</span
            >
            <UIcon
              :name="copied ? 'i-pixelarticons-check' : 'i-pixelarticons-copy'"
              class="size-4 shrink-0 text-dimmed"
            />
          </button>
        </div>
        <LandingConsole />
      </section>

      <!-- Features -->
      <section>
        <header class="landing-section-head">
          <h2 class="landing-h2 font-pixel">Built for screens<br />people share.</h2>
          <p class="landing-sub">
            Filters, tabs, pages and open panels belong in the URL. Bind them once, and reload,
            Back, and shared links all restore the screen.
          </p>
        </header>
        <div class="landing-features">
          <div class="landing-feature is-wide">
            <UIcon name="i-pixelarticons-zap" class="landing-feature-icon" />
            <h3>One tick, one navigation</h3>
            <p>
              Every write made in the same tick, from any component, lands as a single
              <code>router.replace</code>. Guards run once, and Back gets one entry.
            </p>
            <div class="landing-ticks" aria-hidden="true">
              <div
                v-for="column in tickColumns"
                :key="column"
                class="landing-tick"
                :style="{ '--i': column }"
              >
                <i /><i /><i /><b />
              </div>
            </div>
            <div class="landing-ticks-legend">
              <span><i class="bg-[var(--ui-border-accented)]" />ref write</span>
              <span><i class="bg-primary" />navigation</span>
            </div>
          </div>
          <div v-for="feature in features" :key="feature.title" class="landing-feature">
            <UIcon :name="feature.icon" class="landing-feature-icon" />
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.body }}</p>
            <code class="landing-feature-sample">{{ feature.sample }}</code>
          </div>
        </div>
      </section>

      <!-- API -->
      <section>
        <header class="landing-section-head">
          <h2 class="landing-h2 font-pixel">Typed and checked.</h2>
          <p class="landing-sub">
            Hover the code: every type comes from the package itself, and every rule runs when a
            link is opened.
          </p>
        </header>
        <div class="landing-api">
          <div v-for="entry in apiSurface" :key="entry.name" class="landing-api-cell">
            <div class="flex items-baseline justify-between gap-3">
              <span class="font-mono text-sm font-medium text-primary">{{ entry.name }}</span>
              <span class="font-mono text-[11px] text-dimmed">{{ entry.hint }}</span>
            </div>
            <MdcCodeBlock
              :code="entry.code"
              lang="ts"
              twoslash
              theme="vitesse-dark"
              class="landing-code"
            />
          </div>
        </div>
      </section>

      <!-- Batching demo -->
      <section class="landing-split">
        <div class="landing-split-copy">
          <h2 class="landing-h2 font-pixel">Three writes.<br />One navigation.</h2>
          <p class="landing-sub">
            One client per router sits between your refs and vue-router. It updates every bound ref
            at once, then flushes the tick to the URL.
          </p>
          <NuxtLink to="/guide/batching" class="landing-link">
            How batching works
            <UIcon name="i-pixelarticons-arrow-right" class="size-4" />
          </NuxtLink>
        </div>
        <div class="landing-split-demo">
          <DemoBatching />
        </div>
      </section>

      <!-- CTA -->
      <section class="landing-cta vrq-grid-bg">
        <h2 class="landing-cta-title font-pixel">Make every screen a link.</h2>
        <div class="flex flex-wrap justify-center">
          <NuxtLink to="/getting-started/quick-start" class="landing-btn is-primary">
            Read the quick start
            <UIcon name="i-pixelarticons-arrow-right" class="size-4" />
          </NuxtLink>
          <NuxtLink to="/migration/v1-to-v2" class="landing-btn">Coming from v1</NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.landing {
  padding-bottom: 4rem;
}

.landing-frame {
  margin: 0 auto;
  max-width: var(--ui-container);
  border-inline: 1px solid var(--ui-border);
}

.landing-frame > section {
  border-bottom: 1px solid var(--ui-border);
}

/* Hero */
.landing-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 1024px) {
  .landing-hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
  }
}

.landing-hero-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1.75rem;
  border-bottom: 1px solid var(--ui-border);
  padding: 3rem 1rem 2.5rem;
}

@media (min-width: 640px) {
  .landing-hero-copy {
    padding: 4.5rem 2.5rem 3rem;
  }
}

@media (min-width: 1024px) {
  .landing-hero-copy {
    border-bottom: 0;
    border-right: 1px solid var(--ui-border);
  }
}

.landing-title {
  margin: 0;
  font-size: clamp(2.6rem, 6.4vw, 4.25rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--ui-text-highlighted);
}

.landing-lead {
  margin: 0;
  max-width: 27rem;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--ui-text-muted);
}

.landing-btn {
  display: inline-flex;
  height: 2.75rem;
  align-items: center;
  gap: 0.625rem;
  border: 1px solid var(--ui-text-highlighted);
  padding: 0 1.125rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  transition:
    background 0.15s,
    color 0.15s;
}

.landing-btn + .landing-btn {
  border-left: 0;
}

.landing-btn.is-primary {
  background: var(--ui-text-highlighted);
  color: var(--ui-bg);
}

.landing-btn:not(.is-primary):hover {
  background: var(--ui-bg-elevated);
}

.landing-btn:active {
  transform: translateY(1px);
}

.landing-install {
  display: flex;
  max-width: 27rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--ui-border);
  background: var(--vrq-panel);
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--ui-text-highlighted);
}

/* Section heads */
.landing-section-head {
  border-bottom: 1px solid var(--ui-border);
  padding: 3rem 1rem 1.75rem;
}

@media (min-width: 640px) {
  .landing-section-head {
    padding: 3.5rem 2.5rem 2rem;
  }
}

.landing-h2 {
  margin: 0;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  line-height: 1.05;
  color: var(--ui-text-highlighted);
}

.landing-sub {
  margin: 0.875rem 0 0;
  max-width: 40rem;
  line-height: 1.6;
  color: var(--ui-text-muted);
}

/* Features: 1 col, then 2, then 3. Borders come from a hairline gap over the frame colour. */
.landing-features {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1px;
  background: var(--ui-border);
}

@media (min-width: 768px) {
  .landing-features {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing-feature.is-wide {
    grid-column: span 2;
  }
}

@media (min-width: 1024px) {
  .landing-features {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.landing-feature {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.625rem;
  background: var(--ui-bg);
  padding: 1.75rem 1rem;
  transition: background 0.2s;
}

@media (min-width: 640px) {
  .landing-feature {
    padding: 1.75rem;
  }
}

.landing-feature:hover,
.landing-feature.is-wide {
  background: var(--vrq-panel);
}

.landing-feature-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--ui-primary);
}

.landing-feature h3 {
  margin: 0.25rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ui-text-highlighted);
}

.landing-feature p {
  margin: 0;
  max-width: 36rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ui-text-muted);
}

.landing-feature p code {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--ui-text-highlighted);
}

.landing-feature-sample {
  margin-top: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--ui-text-dimmed);
}

.landing-ticks {
  display: flex;
  gap: 6px;
  margin-top: 0.75rem;
  overflow: hidden;
}

.landing-tick {
  display: grid;
  flex: 0 0 auto;
  gap: 3px;
}

.landing-tick i,
.landing-tick b {
  display: block;
  width: 10px;
  height: 10px;
  background: var(--ui-border-accented);
}

.landing-tick b {
  margin-top: 3px;
  background: var(--ui-primary);
  animation: tick-flash 3.6s steps(1) infinite;
  animation-delay: calc(var(--i) * 0.2s);
}

@keyframes tick-flash {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-tick b {
    animation: none;
  }
}

.landing-ticks-legend {
  display: flex;
  gap: 1rem;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ui-text-dimmed);
}

.landing-ticks-legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.landing-ticks-legend i {
  width: 8px;
  height: 8px;
}

/* API */
.landing-api {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1px;
  background: var(--ui-border);
}

@media (min-width: 1024px) {
  .landing-api {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.landing-api-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--ui-bg);
  padding: 1.5rem 1rem;
}

@media (min-width: 640px) {
  .landing-api-cell {
    padding: 1.5rem;
  }
}

.landing-code {
  flex: 1;
  min-width: 0;
  background: var(--vrq-code-bg);
  padding: 1rem;
}

.landing-code :deep(pre) {
  margin: 0;
  border: 0;
  background: transparent !important;
  padding: 0;
  overflow-x: auto;
}

.landing-code :deep(code) {
  font-size: 0.75rem;
  line-height: 1.75;
}

.landing-code :deep(.line) {
  min-height: 1.6em;
  white-space: pre;
}

/* Split */
.landing-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 1024px) {
  .landing-split {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  }
}

.landing-split-copy {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--ui-border);
  padding: 3rem 1rem 2rem;
}

@media (min-width: 640px) {
  .landing-split-copy {
    padding: 3.5rem 2.5rem;
  }
}

@media (min-width: 1024px) {
  .landing-split-copy {
    border-bottom: 0;
    border-right: 1px solid var(--ui-border);
  }
}

.landing-link {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  border-bottom: 1px solid var(--ui-text-highlighted);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
}

.landing-split-demo {
  min-width: 0;
  padding: 1rem;
}

@media (min-width: 640px) {
  .landing-split-demo {
    padding: 2.5rem;
  }
}

.landing-split-demo :deep(.demo-shell) {
  margin: 0;
}

/* CTA */
.landing-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 4.5rem 1rem;
  text-align: center;
}

.landing-cta-title {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.05;
  color: var(--ui-text-highlighted);
}
</style>
