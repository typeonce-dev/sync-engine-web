import { HttpApiBuilder } from "@effect/platform";
import { SyncApi } from "@local/sync";
import { Effect } from "effect";

export const SyncAuthGroupLive = HttpApiBuilder.group(
  SyncApi,
  "syncAuth",
  (handlers) =>
    Effect.gen(function* () {
      return handlers
        .handle("generateToken", ({ payload }) =>
          Effect.fail("Not implemented")
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
