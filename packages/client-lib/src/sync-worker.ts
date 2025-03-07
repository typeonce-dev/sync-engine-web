import { Snapshot } from "@local/sync";
import { liveQuery } from "dexie";
import { Array, Effect, Number, Schema, Stream, SynchronizedRef } from "effect";
import { Dexie, Sync, TempWorkspace, WorkspaceManager } from "./services";

export class LiveQuery extends Schema.TaggedRequest<LiveQuery>()("LiveQuery", {
  failure: Schema.String,
  payload: { workspaceId: Schema.String },
  success: Schema.Boolean,
}) {}

export class Bootstrap extends Schema.TaggedRequest<Bootstrap>()("Bootstrap", {
  failure: Schema.String,
  payload: { workspaceId: Schema.String },
  success: Schema.Boolean,
}) {}

export const WorkerMessage = Schema.Union(Bootstrap);

export class SyncWorker extends Effect.Service<SyncWorker>()("SyncWorker", {
  effect: Effect.gen(function* () {
    return {
      liveSync: (params: { workspaceId: string }) =>
        Effect.gen(function* () {
          const manager = yield* WorkspaceManager;
          const { db } = yield* Dexie;
          const { push } = yield* Sync;

          const snapshotEq = Array.getEquivalence(Number.Equivalence);

          yield* Effect.log(`Live query workspace '${params.workspaceId}'`);

          const workspace = yield* manager
            .getById({ workspaceId: params.workspaceId })
            .pipe(Effect.flatMap(Effect.fromNullable));

          const live = liveQuery(() =>
            db.temp_workspace
              .where("workspaceId")
              .equals(params.workspaceId)
              .toArray()
          );

          yield* Effect.forkScoped(
            Effect.acquireRelease(
              Effect.gen(function* () {
                yield* Effect.log("Subscribing");

                const ref = yield* SynchronizedRef.make(0);
                return live.subscribe((payload) =>
                  Effect.runPromise(
                    Effect.gen(function* () {
                      yield* Effect.log(`Change detected`);

                      const id = yield* ref.pipe(
                        SynchronizedRef.updateAndGet((n) => n + 1)
                      );

                      yield* Stream.runDrain(
                        Stream.make(...payload).pipe(
                          Stream.changesWith((a, b) =>
                            snapshotEq(a.snapshot, b.snapshot)
                          ),
                          Stream.debounce("3 seconds"),
                          Stream.tap((message) =>
                            Effect.gen(function* () {
                              const streamId = yield* ref.get;
                              if (streamId === id) {
                                yield* Effect.log(
                                  `Syncing ${payload.length} changes`
                                );

                                const snapshot = yield* Schema.decode(Snapshot)(
                                  message.snapshot
                                );

                                yield* push({
                                  snapshot,
                                  snapshotId: message.snapshotId,
                                  workspaceId: workspace.workspaceId,
                                });
                              }
                            })
                          )
                        )
                      );
                    })
                  )
                );
              }),
              (subscription) =>
                Effect.gen(function* () {
                  yield* Effect.log("Live query unsubscribing");
                  return subscription.unsubscribe();
                })
            )
          );

          return true;
        }),

      bootstrap: (params: Bootstrap) =>
        Effect.gen(function* () {
          const { push, pull } = yield* Sync;

          const manager = yield* WorkspaceManager;
          const temp = yield* TempWorkspace;

          yield* Effect.log(`Running workspace '${params.workspaceId}'`);

          const workspace = yield* manager
            .getById({ workspaceId: params.workspaceId })
            .pipe(Effect.flatMap(Effect.fromNullable));

          const tempUpdates = yield* temp.getById({
            workspaceId: workspace.workspaceId,
          });

          if (tempUpdates !== undefined) {
            yield* push({
              workspaceId: workspace.workspaceId,
              snapshot: tempUpdates.snapshot,
              snapshotId: tempUpdates.snapshotId,
            });
            yield* Effect.log("Push sync completed");
          } else {
            yield* pull({ workspaceId: workspace.workspaceId });
            yield* Effect.log("Pull sync completed");
          }

          return true;
        }).pipe(
          Effect.mapError(
            (error) => `Bootstrap error: ${JSON.stringify(error)}`
          )
        ),
    };
  }),
}) {}
