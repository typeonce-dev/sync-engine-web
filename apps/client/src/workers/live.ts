import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { SyncWorker } from "@local/client-lib";
import { Effect, Layer } from "effect";
import { RuntimeClient } from "../lib/runtime-client";

const WorkerLive = WorkerRunner.layer((params: SyncWorker.LiveQuery) =>
  Effect.scoped(
    Effect.gen(function* () {
      const worker = yield* SyncWorker.SyncWorker;
      yield* Effect.fork(worker.liveSync({ workspaceId: params.workspaceId }));
      yield* Effect.never;
    })
  )
).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeClient.runFork(WorkerRunner.launch(WorkerLive));
