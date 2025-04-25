# @chronicstone/vue-route-query

[![npm version](https://img.shields.io/npm/v/@chronicstone/vue-route-query.svg)](https://www.npmjs.com/package/@chronicstone/vue-route-query)
[![npm downloads](https://img.shields.io/npm/dm/@chronicstone/vue-route-query.svg)](https://www.npmjs.com/package/@chronicstone/vue-route-query)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@chronicstone/vue-route-query)](https://bundlephobia.com/package/@chronicstone/vue-route-query)
[![license](https://img.shields.io/npm/l/@chronicstone/vue-route-query.svg)](https://github.com/chronicstone/vue-route-query/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A powerful Vue 3 composable for type-safe URL query parameter synchronization with Zod validation, automatic state management, and intelligent default handling.

## Features

- 🔒 **Type-safe**: Full TypeScript support with Zod schema validation
- 🔄 **Bidirectional sync**: Automatic synchronization between component state and URL
- 🎯 **Deep object support**: Handles nested objects and arrays with proper serialization
- ⚡ **Performance optimized**: Batched updates with async processing
- 🧹 **Smart cleanup**: Automatically removes default values from URL
- 🔌 **Vue Router integration**: Seamless integration with Vue Router
- 🎨 **Flexible API**: Support for single values or complex objects
- 🔗 **Nested path support**: Deep object structures automatically transformed to dot notation
- 🔄 **Instance sync**: Multiple instances with the same key stay synchronized
- 📜 **History control**: Choose between push and replace modes for router navigation

## Table of Contents

- [@chronicstone/vue-route-query](#chronicstonevue-route-query)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Basic Usage](#basic-usage)
    - [Single Value](#single-value)
    - [Object Schema](#object-schema)
    - [Object Schema with Root Key](#object-schema-with-root-key)
    - [Nullable Schema](#nullable-schema)
  - [API Reference](#api-reference)
    - [`useRouteQuery<Schema, Nullable, Output>(config)`](#useroutequeryschema-nullable-outputconfig)
      - [Parameters](#parameters)
      - [Returns](#returns)
      - [Important Behavior Notes](#important-behavior-notes)
  - [Advanced Usage](#advanced-usage)
    - [Navigation Mode Control](#navigation-mode-control)
    - [Object Schema with Root Key Prefix](#object-schema-with-root-key-prefix)
    - [Complex Filtering System](#complex-filtering-system)
    - [Sortable Table with Nullable State](#sortable-table-with-nullable-state)
    - [Dynamic Schema with Persistence Control](#dynamic-schema-with-persistence-control)
    - [Pagination with Type Safety](#pagination-with-type-safety)
  - [Under the Hood](#under-the-hood)
    - [State Management Lifecycle](#state-management-lifecycle)
    - [URL Transformation Rules](#url-transformation-rules)
    - [Global Query Manager](#global-query-manager)
  - [Performance Considerations](#performance-considerations)
  - [Browser Support](#browser-support)
  - [TypeScript Support](#typescript-support)
  - [Common Patterns](#common-patterns)
    - [Resetting to Defaults](#resetting-to-defaults)
    - [Conditional Parameters](#conditional-parameters)
    - [Synchronized Instances](#synchronized-instances)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debug Mode](#debug-mode)
  - [License](#license)
  - [Contributing](#contributing)

## Installation

```bash
# npm
npm install @chronicstone/vue-route-query zod vue-router

# yarn
yarn add @chronicstone/vue-route-query zod vue-router

# pnpm
pnpm add @chronicstone/vue-route-query zod vue-router

# bun
bun add @chronicstone/vue-route-query zod vue-router
```

## Basic Usage

### Single Value

```typescript
import { useRouteQuery } from '@chronicstone/vue-route-query'
import { z } from 'zod'

// Single value with key
const activeLayout = useRouteQuery({
  key: 'layout',
  schema: z.enum(['table', 'grid']),
  default: 'table'  // Won't appear in URL when value is 'table'
})

// Type: Ref<'table' | 'grid'>
```

### Object Schema

```typescript
const filters = useRouteQuery({
  schema: {
    search: z.string(),
    status: z.array(z.string()),
    date: z.object({
      from: z.string(),
      to: z.string()
    })
  },
  default: {
    search: '',
    status: [],
    date: { from: '', to: '' }
  }
})

// Type: Ref<{ search: string; status: string[]; date: { from: string; to: string } }>
```

### Object Schema with Root Key

```typescript
const userSettings = useRouteQuery({
  key: 'settings',  // Optional for object schemas - adds root prefix to all properties
  schema: {
    theme: z.string(),
    notifications: z.boolean()
  },
  default: {
    theme: 'light',
    notifications: true
  }
})

// URL: ?settings.theme=dark&settings.notifications=false
// Without key: ?theme=dark&notifications=false
```

### Nullable Schema

```typescript
const sort = useRouteQuery({
  schema: {
    key: z.string(),
    dir: z.enum(['asc', 'desc'])
  },
  default: { key: 'id', dir: 'asc' },
  nullable: true  // Allows the entire object to be null
})

// Type: Ref<{ key: string; dir: 'asc' | 'desc' } | null>
```

## API Reference

### `useRouteQuery<Schema, Nullable, Output>(config)`

The main composable for managing URL query parameters.

#### Parameters

| Parameter  | Type                                     | Required                   | Description                                                             |
| ---------- | ---------------------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| `schema`   | `z.ZodType \| Record<string, z.ZodType>` | Yes                        | Zod schema for validation                                               |
| `default`  | `NonNullable<Output>`                    | Yes                        | Default value (won't appear in URL when active)                         |
| `key`      | `string`                                 | Required for single values | Root key for single value schemas or optional prefix for object schemas |
| `nullable` | `boolean`                                | No                         | Whether the entire value can be null                                    |
| `enabled`  | `boolean`                                | No                         | Enable/disable URL synchronization                                      |
| `debug`    | `boolean`                                | No                         | Enable debug logging                                                    |
| `mode`     | `'push' \| 'replace'`                    | No                         | Navigation mode (default: 'replace')                                    |

#### Returns

`Ref<Output>` - A reactive reference to the synchronized state

#### Important Behavior Notes

1. **Default Values**: Default values are never shown in the URL. A parameter only appears in the URL when its value differs from the default.

2. **Root Keys for Object Schemas**: When using a `key` with object schemas, it acts as a prefix for all properties:

   ```typescript
   // With key
   useRouteQuery({ key: 'user', schema: { name: z.string() }, default: { name: '' } })
   // URL: ?user.name=John
   
   // Without key
   useRouteQuery({ schema: { name: z.string() }, default: { name: '' } })
   // URL: ?name=John
   ```

3. **Nested Objects**: Deep object structures are automatically flattened using dot notation:

   ```typescript
   // State
   { filters: { date: { from: '2024-01-01' } } }
   
   // URL
   ?filters.date.from=2024-01-01
   ```

4. **Arrays**: Arrays are JSON stringified in the URL:

   ```typescript
   // State
   { tags: ['vue', 'typescript'] }
   
   // URL
   ?tags=["vue","typescript"]
   ```

5. **Multiple Instances**: Multiple `useRouteQuery` instances with the same key will stay synchronized. However, ensure they use compatible schemas to avoid conflicts.

6. **Schema Validation**: Don't use Zod's `.default()` function - use the `default` parameter instead.

7. **Navigation Mode**: The `mode` parameter controls how router navigation occurs:
   - `'replace'` (default): Updates the URL without creating a new history entry
   - `'push'`: Creates a new history entry for each update

   When multiple instances update simultaneously, if any instance uses `'push'`, the router will use push mode for that batch of updates.

## Advanced Usage

### Navigation Mode Control

```typescript
// Using push mode for filters to enable browser back/forward navigation
const filters = useRouteQuery({
  schema: {
    category: z.string(),
    priceRange: z.object({
      min: z.number(),
      max: z.number()
    })
  },
  default: {
    category: '',
    priceRange: { min: 0, max: 1000 }
  },
  mode: 'push'  // Each filter change creates a history entry
})

// Using replace mode for preferences (default)
const preferences = useRouteQuery({
  schema: {
    view: z.enum(['list', 'grid']),
    density: z.enum(['compact', 'comfortable'])
  },
  default: {
    view: 'list',
    density: 'comfortable'
  }
  // mode: 'replace' is the default
})

// If both update simultaneously and filters uses 'push',
// the router will use push for that update
```

### Object Schema with Root Key Prefix

```typescript
const accountSettings = useRouteQuery({
  key: 'account',  // All properties will be prefixed with 'account.'
  schema: {
    profile: z.object({
      name: z.string(),
      email: z.string()
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean()
    })
  },
  default: {
    profile: { name: '', email: '' },
    preferences: { theme: 'light', notifications: true }
  }
})

// URL structure:
// ?account.profile.name=John&account.profile.email=john@example.com&account.preferences.theme=dark
// Without the key, it would be:
// ?profile.name=John&profile.email=john@example.com&preferences.theme=dark
```

### Complex Filtering System

```typescript
const filters = useRouteQuery({
  schema: {
    searchQuery: z.string().optional(),
    filters: z.object({
      statuses: z.array(z.string()),
      categories: z.array(z.string()),
      authorizationLabels: z.boolean(),
      startDate: z.object({
        from: z.string(),
        to: z.string()
      })
    }),
    quickFilters: z.record(z.string(), z.any())
  },
  default: {
    searchQuery: '',
    filters: {
      statuses: [],
      categories: [],
      authorizationLabels: false,
      startDate: { from: '', to: '' }
    },
    quickFilters: {}
  }
})

// URL when changed from default:
// ?searchQuery=test&filters.statuses=["TO_CHECK_EP","VALIDATED"]&filters.categories=["19KZisAzakz3WESKnUy_C"]&filters.authorizationLabels=true&filters.startDate.from=2025-04-23&filters.startDate.to=2025-04-24
```

### Sortable Table with Nullable State

```typescript
const sort = useRouteQuery({
  schema: {
    key: z.string(),
    dir: z.enum(['asc', 'desc'])
  },
  default: { key: 'createdAt', dir: 'desc' },
  nullable: true
})

// Can be set to null to disable sorting
sort.value = null

// URL when null: parameters removed
// URL when default: parameters removed
// URL when custom: ?key=name&dir=asc
```

### Dynamic Schema with Persistence Control

```typescript
const userPreferences = useRouteQuery({
  schema: {
    theme: z.enum(['light', 'dark', 'system']),
    density: z.enum(['compact', 'comfortable', 'spacious']),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      frequency: z.enum(['instant', 'daily', 'weekly'])
    })
  },
  default: {
    theme: 'system',
    density: 'comfortable',
    notifications: {
      email: true,
      push: false,
      frequency: 'daily'
    }
  },
  enabled: shouldPersistPreferences.value // Conditionally enable URL sync
})
```

### Pagination with Type Safety

```typescript
const pagination = useRouteQuery({
  schema: {
    pageSize: z.number(),
    pageIndex: z.number()
  },
  default: {
    pageSize: 20,
    pageIndex: 1
  },
  mode: 'push'  // Enable history for pagination
})

// Only appears in URL when different from default
// ?pageSize=50&pageIndex=3
```

## Under the Hood

### State Management Lifecycle

1. **Initialization**: The composable initializes with either URL values (if present) or default values
2. **Synchronization**: Changes to the ref automatically update the URL, and URL changes update the ref
3. **Cleanup**: When values match defaults, they're removed from the URL
4. **Batching**: Multiple rapid updates are batched and processed in the next tick

### URL Transformation Rules

1. **Objects**: Nested objects use dot notation

   ```typescript
   { user: { settings: { theme: 'dark' } } }
   // Becomes: ?user.settings.theme=dark
   ```

2. **Arrays**: Arrays are JSON stringified

   ```typescript
   { tags: ['vue', 'ts'] }
   // Becomes: ?tags=["vue","ts"]
   ```

3. **Booleans**: Represented as string values

   ```typescript
   { active: true }
   // Becomes: ?active=true
   ```

4. **Numbers**: Preserved as numeric strings

   ```typescript
   { count: 42 }
   // Becomes: ?count=42
   ```

5. **Null/Undefined**: Removed from URL entirely

### Global Query Manager

The library uses a singleton `GlobalQueryManager` that:

- Batches multiple updates to prevent race conditions
- Processes all updates in the next tick
- Ensures consistent state across all instances
- Handles cleanup of removed properties
- Intelligently combines navigation modes (push if any instance requests push)

## Performance Considerations

1. **Batching**: All updates are batched to minimize router operations
2. **Shallow Comparison**: Uses shallow comparison for primitives
3. **Deep Comparison**: Uses recursive comparison for objects only when needed
4. **URL Size**: Be mindful of browser URL length limits with large data structures

## Browser Support

Works in all modern browsers that support:

- Vue 3
- URLSearchParams API
- ES2015+

## TypeScript Support

The library is written in TypeScript and provides full type inference:

```typescript
// Inferred type based on schema
const data = useRouteQuery({
  schema: {
    name: z.string(),
    age: z.number().optional()
  },
  default: { name: '', age: undefined }
})

// data is Ref<{ name: string; age?: number }>
```

## Common Patterns

### Resetting to Defaults

```typescript
const filters = useRouteQuery({...})

// Reset to default (removes from URL)
filters.value = { ...defaultFilters }
```

### Conditional Parameters

```typescript
const config = useRouteQuery({
  schema: {
    advanced: z.boolean(),
    // Only used when advanced is true
    customSettings: z.object({...}).optional()
  },
  default: {
    advanced: false,
    customSettings: undefined
  }
})
```

### Synchronized Instances

```typescript
// Both instances stay in sync
const userSettings1 = useRouteQuery({
  key: 'settings',
  schema: z.object({...}),
  default: {...}
})

const userSettings2 = useRouteQuery({
  key: 'settings',  // Same key
  schema: z.object({...}),  // Must be compatible
  default: {...}
})
```

## Troubleshooting

### Common Issues

1. **Schema Mismatch**: Ensure multiple instances with the same key use compatible schemas
2. **Default Values**: Remember that default values never appear in the URL
3. **Type Errors**: Use proper TypeScript types when working with refs
4. **Performance**: For large data structures, consider pagination or filtering
5. **Navigation Conflicts**: When using mixed modes, push takes precedence over replace

### Debug Mode

Enable debug mode to see internal operations:

```typescript
const data = useRouteQuery({
  // ... other options
  debug: true
})
```

## License

MIT

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting a PR.
