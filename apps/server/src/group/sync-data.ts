import { HttpApiBuilder } from "@effect/platform";
import { SyncApi } from "@local/sync";
import { LoroSchemaTransform } from "@local/sync/loro";
import { and, eq } from "drizzle-orm";
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
              const doc = yield* Schema.encode(LoroSchemaTransform)(snapshot);

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
                    .limit(1),
              })({ clientId, workspaceId }).pipe(Effect.flatMap(Array.head));

              doc.import(workspace.snapshot); // 🪄

              const newSnapshot =
                yield* Schema.decode(LoroSchemaTransform)(doc);

              yield* query({
                Request: Schema.Struct({
                  newSnapshot: Schema.Uint8Array,
                }),
                execute: (db, { newSnapshot: snapshot }) =>
                  db.insert(workspaceTable).values({
                    snapshot,
                    clientId: workspace.clientId,
                    workspaceId: workspace.workspaceId,
                    ownerClientId: workspace.ownerClientId,
                    // createdAt
                  }),
              })({ newSnapshot });

              return yield* Effect.fail({
                message: "Not (fully) implemented" as const,
              });
            }).pipe(Effect.mapError((error) => error.message))
        )
        .handle("pull", ({ path: { workspaceId } }) =>
          Effect.fail("Not implemented")
        );
    })
).pipe(Layer.provide(Drizzle.Default));
