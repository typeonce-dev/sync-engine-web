import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
} from "@effect/platform";
import { Context, Schema } from "effect";
import { Snapshot } from "./loro";

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  HttpApiSchema.annotations({ status: 401 })
) {}

export class MissingWorkspace extends Schema.TaggedError<MissingWorkspace>()(
  "MissingWorkspace",
  {},
  HttpApiSchema.annotations({ status: 404 })
) {}

export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
  "DatabaseError",
  {},
  HttpApiSchema.annotations({ status: 500 })
) {}

export const ClientId = Schema.UUID;
export const WorkspaceId = Schema.UUID;
export const SnapshotId = Schema.UUID;
export const Scope = Schema.Literal("read", "read_write");

export class ClientTable extends Schema.Class<ClientTable>("ClientTable")({
  clientId: ClientId,
  createdAt: Schema.DateFromString,
}) {}

export class WorkspaceTable extends Schema.Class<WorkspaceTable>(
  "WorkspaceTable"
)({
  workspaceId: WorkspaceId,
  ownerClientId: ClientId,
  createdAt: Schema.DateFromString,
  clientId: ClientId,
  snapshotId: SnapshotId,
  snapshot: Snapshot,
}) {}

export class TokenTable extends Schema.Class<TokenTable>("TokenTable")({
  tokenId: Schema.Number,
  tokenValue: Schema.String,
  clientId: ClientId,
  workspaceId: WorkspaceId,
  isMaster: Schema.Boolean,
  scope: Scope,
  issuedAt: Schema.DateFromString,
  expiresAt: Schema.NullOr(Schema.DateFromString),
  revokedAt: Schema.NullOr(Schema.DateFromString),
}) {}

export class AuthWorkspace extends Context.Tag("AuthWorkspace")<
  AuthWorkspace,
  WorkspaceTable
>() {}

const authKey = "x-api-key";
export const ApiKey = HttpApiSecurity.apiKey({
  in: "header",
  key: authKey,
});

const ApiKeyHeader = Schema.Struct({
  [authKey]: Schema.String,
});

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    failure: Schema.Union(Unauthorized, MissingWorkspace, DatabaseError),
    provides: AuthWorkspace,
    security: { apiKey: ApiKey },
  }
) {}

export class MasterAuthorization extends HttpApiMiddleware.Tag<MasterAuthorization>()(
  "MasterAuthorization",
  {
    failure: Schema.Union(Unauthorized, MissingWorkspace, DatabaseError),
    provides: AuthWorkspace,
    security: { apiKey: ApiKey },
  }
) {}

export class SyncAuthGroup extends HttpApiGroup.make("syncAuth")
  .add(
    /**
     Allows a client to create a new workshop and upload its initial data to the server. The server marks the client as the owner and issues a master token for full control.
     */
    HttpApiEndpoint.post("generateToken")`/`
      .setPayload(
        Schema.Struct({
          clientId: ClientId,
          workspaceId: WorkspaceId,
          snapshotId: SnapshotId,
          snapshot: WorkspaceTable.fields.snapshot,
        })
      )
      .addError(Schema.String)
      .addSuccess(
        Schema.Struct({
          token: Schema.String,
          workspaceId: WorkspaceTable.fields.workspaceId,
          createdAt: WorkspaceTable.fields.createdAt,
          snapshot: WorkspaceTable.fields.snapshot,
        })
      )
  )
  .add(
    /**
     Allows the owner (via master token) to generate an access token for another client, specifying permissions and expiration. The owner shares this token with the client securely.
     */
    HttpApiEndpoint.post(
      "issueToken"
    )`/${HttpApiSchema.param("workspaceId", Schema.UUID)}/token`
      .setPayload(
        Schema.Struct({
          clientId: ClientId,
          scope: Scope,
          expiresIn: Schema.Duration,
        })
      )
      .addError(Schema.String)
      .addSuccess(
        Schema.Struct({
          token: Schema.String,
          scope: Scope,
          expiresAt: Schema.DateFromString,
        })
      )
      .setHeaders(ApiKeyHeader)
      .middleware(MasterAuthorization)
  )
  .add(
    /**
     Lets the owner revoke access for a specific client by invalidating their access token. Requires the master token and targets the `clientId` tied to the token.
     */
    HttpApiEndpoint.del(
      "revokeToken"
    )`/${HttpApiSchema.param("workspaceId", Schema.UUID)}/token/${HttpApiSchema.param("clientId", Schema.UUID)}`
      .addError(Schema.String)
      .addSuccess(Schema.Boolean)
      .setHeaders(ApiKeyHeader)
      .middleware(MasterAuthorization)
  )
  .add(
    /**
     Provides the owner with a list of all active tokens (master and access) for a workshop, showing their status. Useful for managing access.
     */
    HttpApiEndpoint.get(
      "listTokens"
    )`/${HttpApiSchema.param("workspaceId", Schema.UUID)}/tokens`
      .addError(Schema.String)
      .addSuccess(
        Schema.Array(
          TokenTable.pipe(
            Schema.pick(
              "clientId",
              "tokenValue",
              "scope",
              "isMaster",
              "issuedAt",
              "expiresAt",
              "revokedAt"
            )
          )
        )
      )
      .setHeaders(ApiKeyHeader)
      .middleware(MasterAuthorization)
  )
  .prefix("/workspaces") {}

export class SyncDataGroup extends HttpApiGroup.make("syncData")
  .add(
    /**
     Updates the workshop data on the server with changes from a client. Requires a valid token with `read_write` scope.
     */
    HttpApiEndpoint.put(
      "push"
    )`/${HttpApiSchema.param("workspaceId", Schema.UUID)}/sync`
      .setPayload(WorkspaceTable.pipe(Schema.pick("snapshot", "snapshotId")))
      .addError(Schema.String)
      .addSuccess(
        WorkspaceTable.pipe(Schema.pick("workspaceId", "createdAt", "snapshot"))
      )
      .setHeaders(ApiKeyHeader)
      .middleware(Authorization)
  )
  .add(
    /**
     Retrieves the current workshop data for a client (owner or authorized user). Requires a valid token (master or access) with at least `read` scope. Used for initial download or sync verification.
     */
    HttpApiEndpoint.get(
      "pull"
    )`/${HttpApiSchema.param("workspaceId", Schema.UUID)}/${HttpApiSchema.param("clientId", Schema.UUID)}`
      .addError(Schema.String)
      .addSuccess(
        Schema.Struct({
          workspaceId: WorkspaceTable.fields.workspaceId,
          snapshot: WorkspaceTable.fields.snapshot,
          token: TokenTable.fields.tokenValue,
        })
      )
  )
  .prefix("/workspaces") {}

export class SyncApi extends HttpApi.make("SyncApi")
  .add(SyncAuthGroup)
  .add(SyncDataGroup) {}
