import { HttpApiBuilder } from "@effect/platform";
import { AuthWorkspace, SyncApi } from "@local/sync";
import { SnapshotToLoroDoc } from "@local/sync/loro";
import { Array, Effect, Layer, Schema } from "effect";
import { workspaceTable } from "../db/schema";
import { Drizzle } from "../drizzle";
import { AuthorizationLive } from "../middleware/authorization";

export const SyncDataGroupLive = HttpApiBuilder.group(
  SyncApi,
  "syncData",
  (handlers) =>
    Effect.gen(function* () {
      const { query } = yield* Drizzle;

      return handlers
        .handle(
          "push",
          ({ payload: { snapshot, snapshotId }, path: { workspaceId } }) =>
            Effect.gen(function* () {
              const workspace = yield* AuthWorkspace;
              const doc = yield* Schema.decode(SnapshotToLoroDoc)(snapshot);

              yield* Effect.log(`Pushing workspace ${workspaceId}`);

              doc.import(workspace.snapshot); // 🪄

              const newSnapshot = yield* Schema.encode(SnapshotToLoroDoc)(doc);

              const newWorkspace = yield* query({
                Request: Schema.Struct({
                  newSnapshot: Schema.Uint8ArrayFromSelf,
                }),
                execute: (db, { newSnapshot: snapshot }) =>
                  db
                    .insert(workspaceTable)
                    .values({
                      snapshot,
                      snapshotId,
                      clientId: workspace.clientId,
                      workspaceId: workspace.workspaceId,
                      ownerClientId: workspace.ownerClientId,
                    })
                    .returning(),
              })({ newSnapshot }).pipe(Effect.flatMap(Array.head));

              return {
                workspaceId: newWorkspace.workspaceId,
                createdAt: newWorkspace.createdAt,
                snapshot: newWorkspace.snapshot,
              };
            }).pipe(
              Effect.tapErrorCause(Effect.logError),
              Effect.mapError((error) => error.message)
            )
        )
        .handle("pull", ({ path: { workspaceId } }) =>
          Effect.fail("Not implemented")
        );
    })
).pipe(Layer.provide([Drizzle.Default, AuthorizationLive]));
