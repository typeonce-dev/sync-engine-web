import { HttpApiBuilder } from "@effect/platform";
import { SyncApi, type Scope } from "@local/sync";
import { Config, Effect, Layer, Redacted, Schema } from "effect";
import * as jwt from "jsonwebtoken";
import { workspaceTable } from "../db/schema";
import { Drizzle } from "../drizzle";

interface TokenPayload {
  iat: number; // Issued at (Unix timestamp)
  exp?: number; // Expiration (optional for master tokens)
  sub: string; // Client ID
  workspaceId: string; // Workshop ID
  scope: typeof Scope.Type; // Permission scope
  isMaster: boolean; // Master token flag
}

export const SyncAuthGroupLive = HttpApiBuilder.group(
  SyncApi,
  "syncAuth",
  (handlers) =>
    Effect.gen(function* () {
      const secretKey = yield* Config.redacted("JWT_SECRET");
      const { query } = yield* Drizzle;

      return handlers
        .handle("generateToken", ({ payload }) =>
          Effect.gen(function* () {
            const tokenPayload = {
              iat: Math.floor(Date.now() / 1000), // Current timestamp in seconds
              sub: payload.clientId,
              workspaceId: payload.workspaceId,
              scope: "read_write", // TODO
              isMaster: true, // TODO
            } satisfies TokenPayload;

            yield* Effect.log(tokenPayload);

            const token = jwt.sign(tokenPayload, Redacted.value(secretKey), {
              algorithm: "HS256",
            });

            yield* query({
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
            });

            return {
              token,
              workspaceId: payload.workspaceId,
              snapshot: payload.snapshot,
              createdAt: new Date(),
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
).pipe(Layer.provide(Drizzle.Default));
