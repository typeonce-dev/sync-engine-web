import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { SyncWorker } from "@local/client-lib";
import { Effect, Layer } from "effect";
import { RuntimeClient } from "../lib/runtime-client";

const WorkerLive = WorkerRunner.layerSerialized(SyncWorker.WorkerMessage, {
  Bootstrap: (params) =>
    Effect.gen(function* () {
      const worker = yield* SyncWorker.SyncWorker;
      return yield* worker.bootstrap(params);
    }),
}).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeClient.runFork(WorkerRunner.launch(WorkerLive));
