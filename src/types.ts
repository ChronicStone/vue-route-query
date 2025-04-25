import type { z } from "zod";

export type Primitive = string | number | symbol;

export type GenericObject = Record<Primitive, unknown>;

export type SchemaInput = z.ZodTypeAny | { [key: string]: z.ZodTypeAny };

export type InferSchemaType<
  T extends SchemaInput,
  Nullable extends boolean = false,
> = Nullable extends true
  ? T extends z.ZodTypeAny
    ? z.infer<T> | null
    : T extends { [key: string]: z.ZodTypeAny }
      ? { [K in keyof T]: z.infer<T[K]> } | null
      : never
  : T extends z.ZodTypeAny
    ? z.infer<T>
    : T extends { [key: string]: z.ZodTypeAny }
      ? { [K in keyof T]: z.infer<T[K]> }
      : never;

export type RouteQueryConfig<
  Schema extends SchemaInput,
  Nullable extends boolean = false,
> = {
  schema: Schema;
  default: Nullable extends true
    ? NonNullable<InferSchemaType<Schema, false>> | null
    : NonNullable<InferSchemaType<Schema, false>>;
  nullable?: Nullable;
  enabled?: boolean;
  debug?: boolean;
  mode?: "push" | "replace";
} & (Schema extends z.ZodTypeAny
  ? { key: string } // Required for single value schemas
  : { key?: string }); // Optional for object schemas
