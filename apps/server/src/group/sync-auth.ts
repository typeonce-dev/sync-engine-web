import { HttpApiBuilder } from "@effect/platform";
import { SyncApi, type Scope } from "@local/sync";
import { eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { tokenTable, workspaceTable } from "../db/schema";
import { Drizzle } from "../drizzle";
import { AuthorizationLive } from "../middleware/authorization";
import { Jwt } from "../services/jwt";

export const SyncAuthGroupLive = HttpApiBuilder.group(
  SyncApi,
  "syncAuth",
  (handlers) =>
    Effect.gen(function* () {
      const jwt = yield* Jwt;
      const { query } = yield* Drizzle;

      return handlers
        .handle("generateToken", ({ payload }) =>
          Effect.gen(function* () {
            const scope: typeof Scope.Type = "read_write";
            const isMaster = true;
            const issuedAt = new Date();

            yield* query({
              Request: Schema.Struct({ workspaceId: Schema.String }),
              execute: (db, { workspaceId }) =>
                db
                  .select()
                  .from(workspaceTable)
                  .where(eq(workspaceTable.workspaceId, workspaceId)),
            })({ workspaceId: payload.workspaceId }).pipe(
              Effect.flatMap((rows) =>
                rows.length === 0
                  ? Effect.void
                  : Effect.fail({ message: "Workspace already exists" })
              )
            );

            const token = jwt.sign({
              clientId: payload.clientId,
              workspaceId: payload.workspaceId,
            });

            yield* Effect.all([
              query({
                Request: Schema.Struct({
                  clientId: Schema.String,
                  workspaceId: Schema.String,
                  snapshot: Schema.Uint8ArrayFromSelf,
                }),
                execute: (db, { clientId, snapshot, workspaceId }) =>
                  db.insert(workspaceTable).values({
                    snapshot,
                    clientId,
                    workspaceId,
                    ownerClientId: clientId,
                    snapshotId: payload.snapshotId,
                  }),
              })({
                clientId: payload.clientId,
                snapshot: payload.snapshot,
                workspaceId: payload.workspaceId,
              }),
              query({
                Request: Schema.Struct({
                  clientId: Schema.String,
                  workspaceId: Schema.String,
                  tokenValue: Schema.String,
                }),
                execute: (db, { clientId, tokenValue, workspaceId }) =>
                  db.insert(tokenTable).values({
                    clientId,
                    scope,
                    tokenValue,
                    workspaceId,
                    isMaster,
                    issuedAt,
                    expiresAt: null,
                    revokedAt: null,
                  }),
              })({
                clientId: payload.clientId,
                tokenValue: token,
                workspaceId: payload.workspaceId,
              }),
            ]);

            return {
              token,
              workspaceId: payload.workspaceId,
              snapshot: payload.snapshot,
              createdAt: issuedAt,
            };
          }).pipe(
            Effect.tapErrorCause(Effect.logError),
            Effect.mapError((error) => error.message)
          )
        )
        .handle("issueToken", ({ path: { workspaceId } }) =>
          Effect.fail("Not implemented")
        )
        .handle("listTokens", ({ path: { workspaceId } }) =>
          Effect.fail("Not implemented")
        )
        .handle("revokeToken", ({ path: { workspaceId } }) =>
          Effect.fail("Not implemented")
        );
    })
).pipe(Layer.provide([Drizzle.Default, AuthorizationLive, Jwt.Default]));
