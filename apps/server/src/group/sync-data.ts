import { HttpApiBuilder } from "@effect/platform";
import { AuthWorkspace, SyncApi } from "@local/sync";
import { SnapshotToLoroDoc } from "@local/sync/loro";
import { and, desc, eq } from "drizzle-orm";
import { Array, Effect, Layer, Schema } from "effect";
import { tokenTable, workspaceTable } from "../db/schema";
import { AuthorizationLive } from "../middleware/authorization";
import { Drizzle } from "../services/drizzle";

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
        .handle("pull", ({ path: { workspaceId, clientId } }) =>
          Effect.gen(function* () {
            const { tokenValue } = yield* query({
              Request: Schema.Struct({
                clientId: Schema.String,
                workspaceId: Schema.String,
              }),
              execute: (db, { clientId, workspaceId }) =>
                db
                  .select()
                  .from(tokenTable)
                  .where(
                    and(
                      eq(tokenTable.workspaceId, workspaceId),
                      eq(tokenTable.clientId, clientId)
                    )
                  )
                  .orderBy(desc(tokenTable.issuedAt))
                  .limit(1),
            })({ clientId, workspaceId }).pipe(
              Effect.flatMap(Array.head),
              Effect.mapError(() => ({ message: "Missing token" }))
            );

            const workspace = yield* query({
              Request: Schema.Struct({ workspaceId: Schema.String }),
              execute: (db, { workspaceId }) =>
                db
                  .select()
                  .from(workspaceTable)
                  .where(eq(workspaceTable.workspaceId, workspaceId))
                  .orderBy(desc(workspaceTable.createdAt))
                  .limit(1),
            })({ workspaceId }).pipe(
              Effect.flatMap(Array.head),
              Effect.mapError(() => ({ message: "Missing workspace" }))
            );

            return {
              token: tokenValue,
              snapshot: workspace.snapshot,
              workspaceId: workspace.workspaceId,
            };
          }).pipe(
            Effect.tapErrorCause(Effect.logError),
            Effect.mapError((error) => error.message)
          )
        );
    })
).pipe(Layer.provide([Drizzle.Default, AuthorizationLive]));
