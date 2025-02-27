import { HttpApiBuilder } from "@effect/platform";
import { SyncApi, type Scope } from "@local/sync";
import { Config, Effect, Redacted } from "effect";
import * as jwt from "jsonwebtoken";

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

            const token = jwt.sign(tokenPayload, Redacted.value(secretKey), {
              algorithm: "HS256",
            });

            return {
              token,
              workspaceId: payload.workspaceId,
              snapshot: payload.snapshot,
              createdAt: new Date(),
            };
          })
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
);
