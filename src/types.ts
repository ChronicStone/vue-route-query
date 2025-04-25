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

export type ZodDeepPartial<T extends z.ZodTypeAny> =
  T extends z.ZodObject<z.ZodRawShape>
    ? z.ZodObject<
        {
          [k in keyof T["shape"]]: z.ZodOptional<ZodDeepPartial<T["shape"][k]>>;
        },
        T["_def"]["unknownKeys"],
        T["_def"]["catchall"]
      >
    : T extends z.ZodArray<infer Type, infer Card>
      ? z.ZodArray<ZodDeepPartial<Type>, Card>
      : T extends z.ZodOptional<infer Type>
        ? z.ZodOptional<ZodDeepPartial<Type>>
        : T extends z.ZodNullable<infer Type>
          ? z.ZodNullable<ZodDeepPartial<Type>>
          : T extends z.ZodTuple<infer Items>
            ? {
                [k in keyof Items]: Items[k] extends z.ZodTypeAny
                  ? ZodDeepPartial<Items[k]>
                  : never;
              } extends infer PI
              ? PI extends z.ZodTupleItems
                ? z.ZodTuple<PI>
                : never
              : never
            : T;
