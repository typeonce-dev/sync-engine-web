import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { Effect, Layer } from "effect";
import { WorkerMessage } from "./schema";

const WorkerLive = WorkerRunner.layerSerialized(WorkerMessage, {
  Bootstrap: ({ workspaceId }) =>
    Effect.gen(function* () {
      yield* Effect.log(`Bootstrapping workspace ${workspaceId}`);
      return true;
    }),
}).pipe(Layer.provide(BrowserWorkerRunner.layer));

Effect.runFork(WorkerRunner.launch(WorkerLive));
