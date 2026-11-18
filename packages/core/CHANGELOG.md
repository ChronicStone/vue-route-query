# @chronicstone/vue-route-query

## 2.0.0

### Major Changes

- [#3](https://github.com/ChronicStone/vue-route-query/pull/3) [`d0bc42f`](https://github.com/ChronicStone/vue-route-query/commit/d0bc42fa4af9de06e29150f12103593d5d4dece4) Thanks [@ChronicStone](https://github.com/ChronicStone)! - v2 replaces `useRouteQuery` and its Zod schemas with codecs that carry their own rules (`numberCodec({ default: 1, min: 1 })`), `useQueryState(key, codec)` for one key, `useQueryStates` for a group of keys with cross-field rules, and `dynamicQueryState` for keys that come from runtime definitions. Rejected URL values are listed in `client.issues`. Every write made in the same tick, across all components, is now one navigation. `zod` is no longer a peer dependency. See the migration guide at https://vue-route-query.vercel.app/migration/v1-to-v2.
