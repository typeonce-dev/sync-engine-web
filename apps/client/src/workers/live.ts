import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { RuntimeLib, SyncWorker } from "@local/client-lib";
import { Effect, Layer } from "effect";

const WorkerLive = WorkerRunner.layer((params: SyncWorker.LiveQuery) =>
  Effect.scoped(
    Effect.gen(function* () {
      const worker = yield* SyncWorker.SyncWorker;
      yield* Effect.fork(worker.liveSync({ workspaceId: params.workspaceId }));
      yield* Effect.never;
    })
  )
).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeLib.runFork(WorkerRunner.launch(WorkerLive));
