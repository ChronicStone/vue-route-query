# Agent Rules

## Layout

- `packages/core`: the published package, `@chronicstone/vue-route-query`. `src/index.ts` is the public surface; anything not exported there is internal.
- `apps/docs`: the documentation site (Nuxt + Docus layer in `apps/docs/layer`, content in `apps/docs/content`, live demos in `apps/docs/app/components`).

## Checks

- `bun run check`: type-check, tests, build, and pack check for every workspace (turbo).
- `bun run test`: behaviour tests against a real vue-router, plus type tests (`*.test-d.ts`).
- `bun run docs:twoslash`: compiles every `ts twoslash` block in the docs against the built package.
- A behaviour change needs a test in `packages/core/tests` and, when consumers can see it, a docs update and a changeset (`bun run changeset`).

## Docs

- Use Twoslash for TypeScript examples, and make sure each block compiles.
- Run docs validation commands one at a time. `twoslash:verify`, `nuxt prepare`, `nuxt build` and `nuxt dev` share the content cache (SQLite) and fail when run together.
- `twoslash:verify` deletes `.nuxt/content` and `.data/content`. A running `nuxt dev` then answers 500 until it is restarted, so stop the dev server before verifying, and restart it after.
- `apps/docs/mdc/twoslash-newline.config.ts` keeps Twoslash hovers on the last token of a line (MDC appends a newline to that token before Twoslash runs). Keep it registered first in `apps/docs/nuxt.config.ts`.
- Demos write to the real page URL. Give each demo its own keys so two demos on one page never collide.
- The visual identity is sharp: square corners (`--ui-radius: 0`), hairline borders, Geist, Geist Mono, and Geist Pixel for titles, and `i-pixelarticons-*` icons. Keep new UI in that system and check it in light, dark, and at 375px.

## Commits

- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) with a scope: `type(scope): subject`, such as `core`, `docs`, `landing`, `twoslash`, `release`, or `ci`.
- Keep subjects short, imperative, and without a trailing period.
