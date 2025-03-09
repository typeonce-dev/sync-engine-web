import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { RuntimeLib, SyncWorker } from "@local/client-lib";
import { Effect, Layer } from "effect";

const WorkerLive = WorkerRunner.layerSerialized(SyncWorker.WorkerMessage, {
  Bootstrap: (params) =>
    Effect.gen(function* () {
      const worker = yield* SyncWorker.SyncWorker;
      return yield* worker.bootstrap(params);
    }),
}).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeLib.runFork(WorkerRunner.launch(WorkerLive));
