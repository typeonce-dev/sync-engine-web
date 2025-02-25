import { Schema } from "effect";

export class Bootstrap extends Schema.TaggedRequest<Bootstrap>()("Bootstrap", {
  failure: Schema.String,
  payload: { workspaceId: Schema.String },
  success: Schema.Boolean,
}) {}

export const WorkerMessage = Schema.Union(Bootstrap);
