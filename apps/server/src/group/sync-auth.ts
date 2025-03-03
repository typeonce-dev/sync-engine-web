import { HttpApiBuilder } from "@effect/platform";
import { AuthWorkspace, Scope, SyncApi } from "@local/sync";
import { and, eq, not } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";
import { tokenTable, workspaceTable } from "../db/schema";
import { AuthorizationLive } from "../middleware/authorization";
import { MasterAuthorizationLive } from "../middleware/master-authorization";
import { Drizzle } from "../services/drizzle";
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
            yield* Effect.log(
              `Generating token for workspace ${payload.workspaceId}`
            );

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

            const token = yield* jwt.sign({
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
        .handle("listTokens", ({ path: { workspaceId } }) =>
          Effect.gen(function* () {
            const workspace = yield* AuthWorkspace;
            const tokens = yield* query({
              Request: Schema.Struct({
                workspaceId: Schema.String,
                clientId: Schema.String,
              }),
              execute: (db, { workspaceId, clientId }) =>
                db
                  .select()
                  .from(tokenTable)
                  .where(
                    and(
                      eq(tokenTable.workspaceId, workspaceId),
                      not(eq(tokenTable.clientId, clientId))
                    )
                  ),
            })({ workspaceId, clientId: workspace.clientId });

            return tokens.map((token) => ({
              clientId: token.clientId,
              tokenValue: token.tokenValue,
              scope: token.scope,
              isMaster: token.isMaster,
              issuedAt: token.issuedAt,
              expiresAt: token.expiresAt,
              revokedAt: token.revokedAt,
            }));
          }).pipe(
            Effect.tapErrorCause(Effect.logError),
            Effect.mapError((error) => error.message)
          )
        )
        .handle("issueToken", ({ path: { workspaceId }, payload }) =>
          Effect.gen(function* () {
            yield* Effect.log(`Issuing token for workspace ${workspaceId}`);

            const issuedAt = yield* DateTime.now;
            const expiresAt = issuedAt.pipe(
              DateTime.addDuration(payload.expiresIn),
              DateTime.toDate
            );
            const token = yield* jwt.sign({
              clientId: payload.clientId,
              workspaceId,
            });

            yield* query({
              Request: Schema.Struct({
                clientId: Schema.String,
                workspaceId: Schema.String,
                tokenValue: Schema.String,
                scope: Scope,
                expiresAt: Schema.DateFromSelf,
                issuedAt: Schema.DateFromSelf,
              }),
              execute: (
                db,
                {
                  clientId,
                  tokenValue,
                  workspaceId,
                  scope,
                  expiresAt,
                  issuedAt,
                }
              ) =>
                db.insert(tokenTable).values({
                  clientId,
                  scope,
                  tokenValue,
                  workspaceId,
                  issuedAt,
                  expiresAt,
                  isMaster: false,
                  revokedAt: null,
                }),
            })({
              expiresAt,
              workspaceId,
              tokenValue: token,
              scope: payload.scope,
              clientId: payload.clientId,
              issuedAt: DateTime.toDate(issuedAt),
            });

            return {
              token,
              expiresAt,
              scope: payload.scope,
            };
          }).pipe(
            Effect.tapErrorCause(Effect.logError),
            Effect.mapError((error) => error.message)
          )
        )
        .handle("revokeToken", ({ path: { workspaceId, clientId } }) =>
          Effect.gen(function* () {
            yield* Effect.log(`Revoking token for workspace ${workspaceId}`);

            const revokedAt = yield* DateTime.now;

            yield* query({
              Request: Schema.Struct({
                workspaceId: Schema.String,
                clientId: Schema.String,
              }),
              execute: (db, { workspaceId, clientId }) =>
                db
                  .update(tokenTable)
                  .set({ revokedAt: DateTime.toDate(revokedAt) })
                  .where(
                    and(
                      eq(tokenTable.workspaceId, workspaceId),
                      eq(tokenTable.clientId, clientId)
                    )
                  ),
            })({ workspaceId, clientId });

            return true;
          }).pipe(
            Effect.tapErrorCause(Effect.logError),
            Effect.mapError((error) => error.message)
          )
        );
    })
).pipe(
  Layer.provide([
    Drizzle.Default,
    AuthorizationLive,
    MasterAuthorizationLive,
    Jwt.Default,
  ])
);
