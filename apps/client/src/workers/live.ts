import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { RuntimeLib, SyncWorker } from "@local/client-lib";
import { Effect, Layer } from "effect";

const WorkerLive = WorkerRunner.layer((params: SyncWorker.LiveQuery) =>
  Effect.scoped(
    Effect.gen(function* () {
      const worker = yield* SyncWorker.SyncWorker;
      yield* Effect.log("Startup live query connection");

      yield* Effect.addFinalizer(() =>
        Effect.log("Closed live query connection")
      );

      yield* Effect.fork(worker.liveSync({ workspaceId: params.workspaceId }));
      yield* Effect.never;
    }).pipe(Effect.mapError(() => "Live query error"))
  )
).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeLib.runFork(WorkerRunner.launch(WorkerLive));
