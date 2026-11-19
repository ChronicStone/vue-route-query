# vue-route-query

Typed URL query state for Vue and vue-router. Like `ref()`, but stored in the query string.

**Documentation: https://vue-route-query.chronicstone.dev**

```bash
npm install @chronicstone/vue-route-query
```

## Repository

| Path                               | What it is                                     |
| ---------------------------------- | ---------------------------------------------- |
| [`packages/core`](./packages/core) | The `@chronicstone/vue-route-query` package    |
| [`apps/docs`](./apps/docs)         | The documentation site (Nuxt, Docus, Twoslash) |

```bash
bun install
bun run docs:dev   # docs on http://localhost:3000
bun run check      # type-check, test, build every package
bun run test       # core tests only through turbo
```

Releases go through [changesets](https://github.com/changesets/changesets): add one with `bun run changeset` in the pull request.

## License

[MIT](./LICENSE)
