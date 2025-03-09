import { Schema } from "effect";
import { LoroDoc } from "loro-crdt";
import { type Version } from "./versioning";

export const AnyLoroDocSchema = Schema.instanceOf(LoroDoc);

export class ActivityV1 extends Schema.Class<ActivityV1>("ActivityV1")({
  id: Schema.UUID,
  name: Schema.String,
}) {}

export class ActivityV2 extends Schema.Class<ActivityV2>("ActivityV2")({
  id: Schema.UUID,
  firstName: Schema.String,
  lastName: Schema.String,
}) {}

export class ActivityV3 extends Schema.Class<ActivityV3>("ActivityV3")({
  id: Schema.UUID,
  firstName: Schema.String,
  lastName: Schema.String,
  age: Schema.UndefinedOr(Schema.Number),
}) {}

export const ActivitySchema = {
  1: ActivityV1,
  2: ActivityV2,
  3: ActivityV3,
} as const satisfies Record<Version, Schema.Schema.AnyNoContext>;
