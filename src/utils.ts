import { z } from "zod";
import type { SchemaInput } from "./types";

/**
 * Builds a flat query object from potentially nested data
 */
export function buildQueryObject(
  object: Record<string, any> | any,
  rootKey?: string,
  prefix = "",
): Record<string, any> {
  // Handle non-object (single value) case
  if (typeof object !== "object" || object === null) {
    return rootKey ? { [rootKey]: object } : {};
  }

  // If it's an array and we have a rootKey, treat it as a single value
  if (Array.isArray(object) && rootKey) {
    return { [rootKey]: !object.length ? null : JSON.stringify(object) };
  }

  let result: Record<string, any> = {};

  for (const [key, value] of Object.entries(object)) {
    const newKey = prefix
      ? `${prefix}.${key}`
      : rootKey
        ? `${rootKey}.${key}`
        : key;

    if (Array.isArray(value)) {
      result[newKey] = !value.length ? null : JSON.stringify(value);
    } else if (typeof value === "object" && value !== null) {
      const nestedResult = buildQueryObject(value, undefined, newKey);
      result = { ...result, ...nestedResult };
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Reconstructs nested objects from flat query parameters
 */
export function rebuildObjectFromQuery(
  query: Record<string, any>,
  schema: SchemaInput,
  rootKey?: string,
): Record<string, any> | any {
  // Handle single schema case as before
  if (schema instanceof z.ZodType) {
    if (!rootKey) throw new Error("rootKey is required for single values");
    const value = query[rootKey];

    // Special handling for array schemas
    if (isZodArray(schema)) {
      return value !== undefined ? tryParse(value, schema) : [];
    }

    return value !== undefined ? tryParse(value, schema) : undefined;
  }

  // Get all keys that match our prefix
  // Rest of the function remains the same...
  const result: Record<string, any> = {};
  const prefix = rootKey ? `${rootKey}.` : "";

  const relevantKeys = Object.keys(query).filter(
    (key) => !rootKey || key.startsWith(prefix),
  );

  // Sort keys by depth (number of dots) to process parents before children
  relevantKeys.sort((a, b) => {
    const dotsA = (a.match(/\./g) || []).length;
    const dotsB = (b.match(/\./g) || []).length;
    return dotsA - dotsB;
  });

  for (const fullKey of relevantKeys) {
    const unprefixedKey = rootKey ? fullKey.slice(prefix.length) : fullKey;
    const value = query[fullKey];
    const parts = unprefixedKey.split(".");

    // Get the top-level schema key
    const schemaKey = parts[0];
    if (!(schemaKey in (schema as Record<string, any>))) continue;

    const fieldSchema = (schema as Record<string, any>)[schemaKey];

    // If we already have a non-object value for this path, skip
    // This prevents child paths from overwriting parent values
    const currentPath = parts
      .slice(0, -1)
      .reduce((obj, part) => obj?.[part], result);
    if (currentPath !== undefined && typeof currentPath !== "object") {
      continue;
    }

    // Build the nested structure
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      // Skip if we encounter a non-object value
      if (typeof current[part] !== "object") {
        break;
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    if (typeof current === "object") {
      current[lastPart] = tryParse(value, fieldSchema);
    }
  }

  return result;
}

/**
 * Attempts to parse string values into their appropriate types based on schema
 */
export function tryParse(value: any, schema?: z.ZodTypeAny): any {
  if (typeof value !== "string") return value;

  // For array/object-like strings, always try JSON parse first
  if (value.startsWith("[") || value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      // If we have an array schema, ensure we return an array
      if (schema && isZodArray(schema)) {
        return Array.isArray(parsed) ? parsed : [];
      }
      return parsed;
    } catch {
      // If parsing fails and we have an array schema, return empty array
      if (schema && isZodArray(schema)) {
        return [];
      }
      return value;
    }
  }

  // Handle boolean strings
  if (value === "true") return true;
  if (value === "false") return false;

  // If we have schema information, use it for type coercion
  if (schema) {
    if (schema instanceof z.ZodNumber) {
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
    // Handle array schema when value is not JSON
    if (isZodArray(schema)) {
      return [];
    }
  }

  return value;
}
function isZodArray(schema: z.ZodTypeAny): boolean {
  return schema instanceof z.ZodArray;
}

export function isDirty(initialState: any, currentState: any): boolean {
  const compareArrays = (arr1: any[], arr2: any[]): boolean => {
    if (arr1.length !== arr2.length) return true;

    for (let i = 0; i < arr1.length; i++) {
      if (isDirty(arr1[i], arr2[i])) return true;
    }
    return false;
  };

  const compareObjects = (
    obj1: { [key: string]: any },
    obj2: { [key: string]: any },
  ): boolean => {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return true;

    for (const key of keys1) {
      if (!(key in obj2) || isDirty(obj1[key], obj2[key])) return true;
    }
    return false;
  };

  if (initialState === currentState) return false;

  if (typeof initialState !== typeof currentState) return true;

  if (Array.isArray(initialState) && Array.isArray(currentState))
    return compareArrays(initialState, currentState);

  if (
    typeof initialState === "object" &&
    typeof currentState === "object" &&
    initialState !== null &&
    currentState !== null
  )
    return compareObjects(initialState, currentState);

  return true;
}
