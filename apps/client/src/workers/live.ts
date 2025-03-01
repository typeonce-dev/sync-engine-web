import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { Snapshot } from "@local/sync/loro";
import { liveQuery } from "dexie";
import {
  Array,
  Effect,
  Layer,
  Number,
  Schema,
  Stream,
  SynchronizedRef,
} from "effect";
import { Dexie } from "../lib/dexie";
import { RuntimeClient } from "../lib/runtime-client";
import { Sync } from "../lib/services/sync";
import { WorkspaceManager } from "../lib/services/workspace-manager";
import { type LiveQuery } from "./schema";

const main = (params: { workspaceId: string }) =>
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
                            workspace,
                            snapshot,
                            snapshotId: message.snapshotId,
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
  });

const WorkerLive = WorkerRunner.layer((params: LiveQuery) =>
  Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.log("Startup live query connection");

      yield* Effect.addFinalizer(() =>
        Effect.log("Closed live query connection")
      );

      yield* Effect.fork(main({ workspaceId: params.workspaceId }));
      yield* Effect.never;
    }).pipe(Effect.mapError(() => "Live query error"))
  )
).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeClient.runFork(WorkerRunner.launch(WorkerLive));
