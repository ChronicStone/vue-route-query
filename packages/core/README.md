# @chronicstone/vue-route-query

Typed URL query state for Vue and vue-router. Like `ref()`, but stored in the query string.

**Documentation: https://vue-route-query.vercel.app**

```bash
npm install @chronicstone/vue-route-query
```

```ts
import {
  enumCodec,
  numberCodec,
  useQueryState,
  useQueryStates,
} from '@chronicstone/vue-route-query'

// One key, one typed ref
const page = useQueryState('page', numberCodec({ default: 1, int: true, min: 1 }))
page.value++ // ?page=2

// Several keys, one object, one navigation
const table = useQueryStates({
  prefix: 'users',
  schema: {
    page: numberCodec({ default: 1, int: true, min: 1 }),
    pageSize: numberCodec({ default: 20, min: 10, max: 100, outOfRange: 'clamp' }),
    sort: enumCodec(['name', 'createdAt'], { default: 'createdAt' }),
  },
  urlKeys: { pageSize: 'size' },
})
// ?users.page=2&users.size=50&users.sort=name
```

- **Typed and checked.** Codecs parse every key into a real type and apply its rules: `min`, `max`, `int`, lengths, patterns, enums, or your own `validate`. A bad value falls back to the default, or is clamped.
- **Cross-field rules.** `from <= to`, `min <= max`: a link that breaks one loses only the keys you name.
- **Batched.** Every write made in the same tick, across all components, becomes one navigation.
- **Dynamic keys.** Filters a user builds at runtime get their own keys with `dynamicQueryState`.
- **Any schema library for objects.** `schemaCodec` stores an object as JSON in one key, checked by Zod, Valibot, or ArkType through Standard Schema.
- **Small.** About 5 kB minified and gzipped. `vue` 3.3+ and `vue-router` 4 or 5 are the only peer dependencies.

Coming from v1 (`useRouteQuery` with Zod)? See the [migration guide](https://vue-route-query.vercel.app/migration/v1-to-v2).

## License

[MIT](https://github.com/ChronicStone/vue-route-query/blob/main/LICENSE)
