import { Schema } from "effect";

export class LiveQuery extends Schema.TaggedRequest<LiveQuery>()("LiveQuery", {
  failure: Schema.String,
  payload: { workspaceId: Schema.String },
  success: Schema.Boolean,
}) {}

export class Bootstrap extends Schema.TaggedRequest<Bootstrap>()("Bootstrap", {
  failure: Schema.String,
  payload: { workspaceId: Schema.String },
  success: Schema.Boolean,
}) {}

export const WorkerMessage = Schema.Union(Bootstrap);
