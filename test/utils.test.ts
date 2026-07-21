import { describe, expect, it } from "vitest";
import { z } from "zod/v3";
import {
  buildQueryObject,
  rebuildObjectFromQuery,
  tryParse,
  isDirty,
  deepPartialify,
  deepMerge,
} from "../src/utils";

// ---------------------------------------------------------------------------
// buildQueryObject
// ---------------------------------------------------------------------------
describe("buildQueryObject", () => {
  it("returns flat keys unchanged", () => {
    expect(buildQueryObject({ a: "1", b: 2 })).toEqual({ a: "1", b: 2 });
  });

  it("prefixes keys with rootKey", () => {
    expect(buildQueryObject({ x: "hello" }, "root")).toEqual({
      "root.x": "hello",
    });
  });

  it("flattens nested objects with dot notation", () => {
    expect(buildQueryObject({ a: { b: { c: "deep" } } })).toEqual({
      "a.b.c": "deep",
    });
  });

  it("serializes non-empty arrays as JSON", () => {
    expect(buildQueryObject({ tags: ["a", "b"] })).toEqual({
      tags: JSON.stringify(["a", "b"]),
    });
  });

  it("converts empty arrays to null", () => {
    expect(buildQueryObject({ tags: [] })).toEqual({ tags: null });
  });

  it("wraps a primitive value with rootKey", () => {
    expect(buildQueryObject("hello", "key")).toEqual({ key: "hello" });
  });

  it("wraps a number primitive with rootKey", () => {
    expect(buildQueryObject(42, "n")).toEqual({ n: 42 });
  });

  it("returns {} for a primitive without rootKey", () => {
    expect(buildQueryObject("hello")).toEqual({});
  });

  it("handles null as a primitive", () => {
    expect(buildQueryObject(null, "k")).toEqual({ k: null });
  });

  it("serializes a top-level array with rootKey", () => {
    expect(buildQueryObject(["x", "y"], "arr")).toEqual({
      arr: JSON.stringify(["x", "y"]),
    });
  });

  it("converts a top-level empty array with rootKey to null", () => {
    expect(buildQueryObject([], "arr")).toEqual({ arr: null });
  });
});

// ---------------------------------------------------------------------------
// rebuildObjectFromQuery
// ---------------------------------------------------------------------------
describe("rebuildObjectFromQuery", () => {
  it("returns a string value for a simple z.string() schema", () => {
    const result = rebuildObjectFromQuery(
      { name: "alice" },
      z.string(),
      "name",
    );
    expect(result).toBe("alice");
  });

  it("coerces a string to number for z.number() schema", () => {
    const result = rebuildObjectFromQuery({ age: "30" }, z.number(), "age");
    expect(result).toBe(30);
  });

  it("returns [] for a missing array value", () => {
    const result = rebuildObjectFromQuery(
      {},
      z.array(z.string()),
      "tags",
    );
    expect(result).toEqual([]);
  });

  it("parses a JSON array string for z.array() schema", () => {
    const result = rebuildObjectFromQuery(
      { tags: '["a","b"]' },
      z.array(z.string()),
      "tags",
    );
    expect(result).toEqual(["a", "b"]);
  });

  it("rebuilds an object from flat query keys (no rootKey)", () => {
    const schema = { a: z.string(), b: z.number() };
    const result = rebuildObjectFromQuery({ a: "hello", b: "5" }, schema);
    expect(result).toEqual({ a: "hello", b: 5 });
  });

  it("rebuilds an object from prefixed keys with rootKey", () => {
    const schema = { x: z.string(), y: z.string() };
    const result = rebuildObjectFromQuery(
      { "f.x": "one", "f.y": "two" },
      schema,
      "f",
    );
    expect(result).toEqual({ x: "one", y: "two" });
  });

  it("rebuilds nested objects from dotted keys", () => {
    const schema = { nested: z.object({ x: z.string() }) };
    const result = rebuildObjectFromQuery({ "nested.x": "val" }, schema);
    expect(result).toEqual({ nested: { x: "val" } });
  });

  it("ignores query keys not present in the schema", () => {
    const schema = { a: z.string() };
    const result = rebuildObjectFromQuery(
      { a: "ok", unknown: "ignored" },
      schema,
    );
    expect(result).toEqual({ a: "ok" });
  });

  it("throws when a single ZodType schema has no rootKey", () => {
    expect(() => rebuildObjectFromQuery({}, z.string())).toThrow(
      "rootKey is required for single values",
    );
  });

  it("returns undefined for a missing non-array single value", () => {
    const result = rebuildObjectFromQuery({}, z.string(), "missing");
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// tryParse
// ---------------------------------------------------------------------------
describe("tryParse", () => {
  it("parses a JSON array string", () => {
    expect(tryParse('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it("parses a JSON object string", () => {
    expect(tryParse('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns [] for invalid JSON with array schema", () => {
    expect(tryParse("[abc", z.array(z.string()))).toEqual([]);
  });

  it("returns the raw string for invalid JSON without array schema", () => {
    expect(tryParse("[abc")).toBe("[abc");
  });

  it('converts "true" to boolean true', () => {
    expect(tryParse("true")).toBe(true);
  });

  it('converts "false" to boolean false', () => {
    expect(tryParse("false")).toBe(false);
  });

  it("coerces a numeric string with z.number() schema", () => {
    expect(tryParse("42", z.number())).toBe(42);
  });

  it("returns the string for non-numeric value with z.number() schema", () => {
    expect(tryParse("abc", z.number())).toBe("abc");
  });

  it("returns [] for a non-JSON string with array schema", () => {
    expect(tryParse("foo", z.array(z.string()))).toEqual([]);
  });

  it("returns non-string values as-is", () => {
    expect(tryParse(123)).toBe(123);
    expect(tryParse(null)).toBe(null);
    expect(tryParse(undefined)).toBe(undefined);
    const obj = { x: 1 };
    expect(tryParse(obj)).toBe(obj);
  });

  it("parses a valid JSON array with array schema", () => {
    expect(tryParse('["a","b"]', z.array(z.string()))).toEqual(["a", "b"]);
  });

  it("returns [] when JSON parses to non-array with array schema", () => {
    expect(tryParse('{"a":1}', z.array(z.string()))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isDirty
// ---------------------------------------------------------------------------
describe("isDirty", () => {
  it("returns false for identical primitives", () => {
    expect(isDirty(1, 1)).toBe(false);
    expect(isDirty("a", "a")).toBe(false);
    expect(isDirty(true, true)).toBe(false);
  });

  it("returns true for different primitives", () => {
    expect(isDirty(1, 2)).toBe(true);
    expect(isDirty("a", "b")).toBe(true);
  });

  it("returns true for different types", () => {
    expect(isDirty(1, "1")).toBe(true);
    expect(isDirty(true, 1)).toBe(true);
  });

  it("returns false for identical arrays", () => {
    expect(isDirty([1, 2, 3], [1, 2, 3])).toBe(false);
  });

  it("returns true for arrays with different length", () => {
    expect(isDirty([1, 2], [1, 2, 3])).toBe(true);
  });

  it("returns true for arrays with different content", () => {
    expect(isDirty([1, 2], [1, 9])).toBe(true);
  });

  it("returns false for identical objects", () => {
    expect(isDirty({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(false);
  });

  it("returns true for objects with different keys", () => {
    expect(isDirty({ a: 1 }, { b: 1 })).toBe(true);
  });

  it("returns true for objects with different values", () => {
    expect(isDirty({ a: 1 }, { a: 2 })).toBe(true);
  });

  it("returns true for objects with different key count", () => {
    expect(isDirty({ a: 1, b: 2 }, { a: 1 })).toBe(true);
  });

  it("detects deep nested differences", () => {
    expect(isDirty({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
      true,
    );
    expect(isDirty({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
      false,
    );
  });

  it("returns false for the same reference", () => {
    const obj = { a: 1 };
    expect(isDirty(obj, obj)).toBe(false);
  });

  it("handles null values", () => {
    expect(isDirty(null, null)).toBe(false);
    expect(isDirty(null, {})).toBe(true);
    expect(isDirty({}, null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deepPartialify
// ---------------------------------------------------------------------------
describe("deepPartialify", () => {
  it("makes object fields optional (accepts {})", () => {
    const schema = z.object({ a: z.string() });
    const partial = deepPartialify(schema);
    expect(partial.parse({})).toEqual({});
  });

  it("still accepts fully-provided values", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const partial = deepPartialify(schema);
    expect(partial.parse({ a: "hi", b: 42 })).toEqual({ a: "hi", b: 42 });
  });

  it("handles deeply nested objects", () => {
    const schema = z.object({ a: z.object({ b: z.string() }) });
    const partial = deepPartialify(schema);
    expect(partial.parse({ a: {} })).toEqual({ a: {} });
    expect(partial.parse({})).toEqual({});
  });

  it("handles arrays of objects", () => {
    const schema = z.array(z.object({ a: z.string() }));
    const partial = deepPartialify(schema);
    expect(partial.parse([{}])).toEqual([{}]);
    expect(partial.parse([])).toEqual([]);
  });

  it("handles z.optional wrapping", () => {
    const schema = z.optional(z.string());
    const partial = deepPartialify(schema);
    expect(partial.parse(undefined)).toBeUndefined();
    expect(partial.parse("hello")).toBe("hello");
  });

  it("handles z.nullable with nested object", () => {
    const schema = z.nullable(z.object({ a: z.string() }));
    const partial = deepPartialify(schema);
    expect(partial.parse(null)).toBeNull();
    expect(partial.parse({})).toEqual({});
    expect(partial.parse({ a: "val" })).toEqual({ a: "val" });
  });

  it("handles z.tuple with mixed types", () => {
    const schema = z.tuple([z.string(), z.object({ a: z.string() })]);
    const partial = deepPartialify(schema);
    // tuple items are recursively partialified but NOT made optional themselves,
    // so the string item still requires a string, while the object item accepts {}
    const result = partial.parse(["hello", {}]);
    expect(result).toEqual(["hello", {}]);
  });

  it("returns leaf schemas unchanged", () => {
    const schema = z.string();
    const partial = deepPartialify(schema);
    expect(partial.parse("hello")).toBe("hello");
  });

  it("returns z.number() unchanged", () => {
    const schema = z.number();
    const partial = deepPartialify(schema);
    expect(partial.parse(42)).toBe(42);
  });

  it("handles a complex realistic schema", () => {
    const schema = z.object({
      search: z.string(),
      status: z.array(z.string()),
      dateRange: z.object({
        from: z.string(),
        to: z.string(),
      }),
      options: z.object({
        includeArchived: z.boolean(),
        onlyFavorites: z.boolean(),
      }),
    });
    const partial = deepPartialify(schema);

    expect(partial.parse({})).toEqual({});
    expect(partial.parse({ search: "test" })).toEqual({ search: "test" });
    expect(partial.parse({ dateRange: { from: "2024-01-01" } })).toEqual({
      dateRange: { from: "2024-01-01" },
    });
    expect(partial.parse({ options: {} })).toEqual({ options: {} });
  });
});

// ---------------------------------------------------------------------------
// deepMerge
// ---------------------------------------------------------------------------
describe("deepMerge", () => {
  it("overwrites flat values from source", () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 9 })).toEqual({ a: 1, b: 9 });
  });

  it("preserves target values when source value is undefined", () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: undefined } as any)).toEqual({
      a: 1,
      b: 2,
    });
  });

  it("deeply merges nested objects", () => {
    const target = { nested: { a: 1, b: 2 } };
    const source = { nested: { b: 9 } } as any;
    expect(deepMerge(target, source)).toEqual({ nested: { a: 1, b: 9 } });
  });

  it("replaces arrays entirely (no array merge)", () => {
    const target = { tags: [1, 2, 3] };
    const source = { tags: [4, 5] };
    expect(deepMerge(target, source)).toEqual({ tags: [4, 5] });
  });

  it("does not mutate the original target", () => {
    const target = { a: 1, nested: { b: 2 } };
    const copy = JSON.parse(JSON.stringify(target));
    deepMerge(target, { a: 9 });
    expect(target).toEqual(copy);
  });

  it("handles multiple levels of nesting", () => {
    const target = { a: { b: { c: 1, d: 2 }, e: 3 } };
    const source = { a: { b: { c: 99 } } } as any;
    expect(deepMerge(target, source)).toEqual({
      a: { b: { c: 99, d: 2 }, e: 3 },
    });
  });

  it("adds new keys from source", () => {
    expect(deepMerge({ a: 1 } as any, { b: 2 } as any)).toEqual({
      a: 1,
      b: 2,
    });
  });
});
