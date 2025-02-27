import { ClientId, WorkspaceId } from "@local/sync";
import { Snapshot } from "@local/sync/loro";
import { Schema } from "effect";

export class ClientTable extends Schema.Class<ClientTable>("ClientTable")({
  clientId: ClientId,
}) {}

export class WorkspaceTable extends Schema.Class<WorkspaceTable>(
  "WorkspaceTable"
)({
  workspaceId: WorkspaceId,
  snapshot: Snapshot,
  token: Schema.NullOr(Schema.String),

  version: Schema.NullOr(Schema.Uint8Array),
}) {}

export class TempWorkspaceTable extends Schema.Class<TempWorkspaceTable>(
  "TempWorkspaceTable"
)({
  workspaceId: WorkspaceId,
  snapshot: Snapshot,
}) {}
