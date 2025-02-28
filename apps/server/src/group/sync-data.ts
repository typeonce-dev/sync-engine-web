import { HttpApiBuilder } from "@effect/platform";
import { SyncApi } from "@local/sync";
import { SnapshotToLoroDoc } from "@local/sync/loro";
import { and, desc, eq } from "drizzle-orm";
import { Array, Effect, Layer, Schema } from "effect";
import { workspaceTable } from "../db/schema";
import { Drizzle } from "../drizzle";

export const SyncDataGroupLive = HttpApiBuilder.group(
  SyncApi,
  "syncData",
  (handlers) =>
    Effect.gen(function* () {
      const { query } = yield* Drizzle;
      return handlers
        .handle(
          "push",
          ({ payload: { clientId, snapshot }, path: { workspaceId } }) =>
            Effect.gen(function* () {
              const doc = yield* Schema.decode(SnapshotToLoroDoc)(snapshot);

              yield* Effect.log(`Pushing workspace ${workspaceId}`);

              const workspace = yield* query({
                Request: Schema.Struct({
                  workspaceId: Schema.UUID,
                  clientId: Schema.UUID,
                }),
                execute: (db, { workspaceId, clientId }) =>
                  db
                    .select()
                    .from(workspaceTable)
                    .where(
                      and(
                        eq(workspaceTable.workspaceId, workspaceId),
                        eq(workspaceTable.clientId, clientId)
                      )
                    )
                    .orderBy(desc(workspaceTable.createdAt))
                    .limit(1),
              })({ clientId, workspaceId }).pipe(Effect.flatMap(Array.head));

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
).pipe(Layer.provide(Drizzle.Default));
