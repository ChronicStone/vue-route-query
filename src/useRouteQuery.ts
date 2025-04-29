// useRouteQuery.ts
import { type Ref, onUnmounted, ref, toRaw, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { z } from "zod";
import { GlobalQueryManager } from "./queryManager";
import type {
  GenericObject,
  InferSchemaType,
  RouteQueryConfig,
  SchemaInput,
} from "./types";
import {
  buildQueryObject,
  deepMerge,
  deepPartialify,
  isDirty,
  rebuildObjectFromQuery,
  tryParse,
} from "./utils";

/**
 * Vue composable for syncing component state with URL query parameters
 */
export function useRouteQuery<
  Schema extends SchemaInput,
  Nullable extends boolean = false,
>(
  params: RouteQueryConfig<Schema, Nullable>,
): Ref<InferSchemaType<Schema, Nullable>> {
  const route = useRoute();
  const router = useRouter();
  const defaultValue = params.default;
  const mode = params.mode ?? "replace";
  const instanceId = Symbol();
  // Default to 'replace' if not specified

  if (params.debug)
    console.log("useRouteQuery init with:", {
      route: route.query,
      default: defaultValue,
      schema: params.schema,
      mode: mode,
    });
  const queryManager = GlobalQueryManager.getInstance();

  const { nullable = false, key: rootKey } = params;
  if (params.schema instanceof z.ZodType && !rootKey) {
    throw new Error("key is required for single value schemas");
  }

  const instanceKeys = params.schema instanceof z.ZodType || params.key
  ? [params.key!] 
  : Object.keys(params.schema)

  queryManager.init(router, route.query);
  queryManager.registerInstance(instanceId, instanceKeys);

  onUnmounted(() => queryManager.unregisterInstance(instanceId));

  const baseSchema =
    params.schema instanceof z.ZodType
      ? params.schema
      : z.object(params.schema as { [key: string]: z.ZodTypeAny }).partial();

  const zodSchema = nullable ? baseSchema.nullable() : baseSchema;

  // Initialize with current URL state if present, otherwise use default
  const initialQuery = route.query;
  const parsedInitialQuery = parseQuery(initialQuery);
  if (params.debug)
    console.log("initializing with:", {
      query: initialQuery,
      parsed: parsedInitialQuery,
      hasUrlState: Object.keys(initialQuery).length > 0,
    });

  // Track previous state for comparison
  let previousValue = parsedInitialQuery;

  const dataRef = ref(parsedInitialQuery) as Ref<
    InferSchemaType<Schema, Nullable>
  >;

  if (params.enabled ?? true) {
    watch(
      () => JSON.stringify(route.query),
      (raw) => {
        const query = raw ? JSON.parse(raw) : {};
        queryManager.updateCurrentQuery(query);
        const parsed = parseQuery(query);
        if (!isDirty(parsed, dataRef.value)) return;
        dataRef.value = parsed as InferSchemaType<Schema, Nullable>;
      },
      { immediate: true },
    );

    watch(
      dataRef,
      (newValue) => {
        // Store a reference to the current value before changes
        const prevValue = JSON.parse(JSON.stringify(previousValue));
        // Update previous value for next change
        previousValue = JSON.parse(JSON.stringify(newValue));

        // Handle null case for nullable schemas
        if (newValue === null && nullable) {
          if (typeof params.schema === "object") {
            const schemaKeys = Object.keys(params.schema).map((key) =>
              rootKey ? `${rootKey}.${key}` : key,
            );
            queryManager.removeKeys(schemaKeys, mode);
          } else {
            queryManager.enqueue(rootKey!, undefined, mode);
          }
          return;
        }

        // For single schema case
        if (!(typeof params.schema === "object")) {
          if (
            newValue === "" ||
            newValue === undefined ||
            newValue === null ||
            (Array.isArray(newValue) && newValue.length === 0) ||
            newValue === defaultValue
          ) {
            queryManager.enqueue(rootKey!, undefined, mode);
          } else {
            queryManager.enqueue(rootKey!, newValue, mode);
          }
          return;
        }

        // For object schema case
        const queryUpdates = buildQueryObject(newValue, rootKey);
        const defaultQueryUpdates = buildQueryObject(defaultValue, rootKey);

        // FIX: Handle recursive object structure checking
        if (typeof params.schema === "object") {
          Object.keys(params.schema).forEach((schemaKey) => {
            const keyPath = rootKey ? `${rootKey}.${schemaKey}` : schemaKey;
            const currentValue = (newValue as any)?.[schemaKey];
            const prevSchemaValue = (prevValue as any)?.[schemaKey];

            // Check if the object was emptied or a key was removed
            if (
              typeof currentValue === "object" &&
              currentValue !== null &&
              !Array.isArray(currentValue) &&
              typeof prevSchemaValue === "object" &&
              prevSchemaValue !== null &&
              !Array.isArray(prevSchemaValue)
            ) {
              // Check for keys that were removed from this object
              const currentKeys = Object.keys(currentValue);
              const prevKeys = Object.keys(prevSchemaValue);

              // Find removed keys
              const removedKeys = prevKeys.filter(
                (key) => !currentKeys.includes(key),
              );

              // For each removed key, remove all its URL parameters
              for (const removedKey of removedKeys) {
                const removePath = `${keyPath}.${removedKey}.`;
                queryManager.removeAllWithPrefix(removePath, mode);
              }

              // Special handling for empty object
              if (Object.keys(currentValue).length === 0) {
                queryManager.removeAllWithPrefix(`${keyPath}.`, mode);
              }
            }
          });
        }

        // Process each field, applying our cleaning rules
        Object.entries(queryUpdates).forEach(([key, value]) => {
          const defaultVal = defaultQueryUpdates[key];

          if (
            value === "" ||
            value === undefined ||
            value === null ||
            (Array.isArray(value) && value.length === 0) ||
            (typeof defaultVal !== "object" && value === defaultVal) ||
            (typeof defaultVal === "object" &&
              typeof value === "object" &&
              !isDirty(value || {}, defaultVal || {}))
          ) {
            queryManager.enqueue(key, undefined, mode);
          } else {
            queryManager.enqueue(key, value, mode);
          }
        });
      },
      { deep: true },
    );
  }

  function parseQuery(query: GenericObject): InferSchemaType<Schema, Nullable> {
    const _defaultValue = Object.freeze(
      JSON.parse(JSON.stringify(toRaw(defaultValue))),
    );
    // For single schema types, handle the direct value
    if (params.schema instanceof z.ZodType) {
      if (params.debug)
        console.log("single schema", rootKey, {
          rootKey,
          query,
          _defaultValue,
        });
      const value = rootKey ? query[rootKey] : undefined;
      try {
        const parsed =
          value !== undefined ? tryParse(value, params.schema) : _defaultValue;
        return parsed as InferSchemaType<Schema, Nullable>;
      } catch {
        return _defaultValue as InferSchemaType<Schema, Nullable>;
      }
    }

    // For object schemas, reconstruct and parse
    const rebuiltQuery = rebuildObjectFromQuery(query, params.schema, rootKey);
    let parsedData: InferSchemaType<Schema, Nullable>;

    try {
      parsedData = deepPartialify(zodSchema).parse(
        rebuiltQuery,
      ) as InferSchemaType<Schema, Nullable>;
    } catch (err) {
      console.error("FAILED TO PARSE", {
        err,
        rebuiltQuery,
      });
      parsedData = nullable
        ? (null as InferSchemaType<Schema, Nullable>)
        : ({} as InferSchemaType<Schema, Nullable>);
    }

    if (nullable && parsedData === null) {
      return null as InferSchemaType<Schema, Nullable>;
    }

    return deepMerge(_defaultValue, parsedData) as InferSchemaType<
      Schema,
      Nullable
    >;
  }

  return dataRef;
}
