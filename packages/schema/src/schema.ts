import { Schema } from "effect";
import { LoroDoc } from "loro-crdt";
import { type Version } from "./versioning";

export const AnyLoroDocSchema = Schema.instanceOf(LoroDoc);

export class FoodV1 extends Schema.Class<FoodV1>("FoodV1")({
  id: Schema.UUID,
  name: Schema.String,
  calories: Schema.Number.pipe(Schema.positive()),
}) {}

export class MealV1 extends Schema.Class<MealV1>("MealV1")({
  id: Schema.UUID,
  foodId: FoodV1.fields.id,
  quantity: Schema.Number.pipe(Schema.positive()),
}) {}

export const Table = Schema.Literal("food", "meal");
export const VersioningSchema = {
  1: Schema.Struct({
    [Table.literals[0]]: Schema.Array(FoodV1),
    [Table.literals[1]]: Schema.Array(MealV1),
  }),
} as const satisfies Record<Version, Schema.Schema.AnyNoContext>;
