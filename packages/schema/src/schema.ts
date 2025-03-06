import { Schema } from "effect";

export class ActivityV1 extends Schema.Class<ActivityV1>("ActivityV1")({
  id: Schema.UUID,
  name: Schema.String,
}) {}

export class ActivityV2 extends Schema.Class<ActivityV2>("ActivityV2")({
  id: Schema.UUID,
  firstName: Schema.String,
  lastName: Schema.String,
}) {}

export const ActivitySchema = {
  1: ActivityV1,
  2: ActivityV2,
} as const;
