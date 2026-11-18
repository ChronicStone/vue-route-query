type GenericValue = never extends never ? unknown : never

/** An object whose values are decoded by the owning boundary. */
export type GenericObject = { [K in string | number | symbol]: GenericValue }

function objectTag<T>(value: T): string {
  return Object.prototype.toString.call(value)
}

/** Type predicate to check if a value is null or undefined. */
export function isNullish<T>(value: T): value is T & (null | undefined) {
  return value === null || value === undefined
}

/** Type predicate to check if a value is a string. */
export function isString<T>(value: T): value is T & string {
  return objectTag(value) === '[object String]'
}

/** Type predicate to check if a value is an object (excluding null and arrays). */
export function isObject<T>(value: T): value is T & GenericObject {
  return objectTag(value) === '[object Object]' && !Array.isArray(value)
}

/** Type predicate to check if a value has a specific property. */
export function hasProperty<T, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & GenericObject {
  return (isObject(value) || Array.isArray(value)) && key in value
}
