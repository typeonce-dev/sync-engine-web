import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { RuntimeLib, Service, SyncWorker } from "@local/client-lib";
import { Effect, Layer } from "effect";

const WorkerLive = WorkerRunner.layerSerialized(SyncWorker.WorkerMessage, {
  Bootstrap: (params) =>
    Effect.gen(function* () {
      const { push, pull } = yield* Service.Sync;

      const manager = yield* Service.WorkspaceManager;
      const temp = yield* Service.TempWorkspace;

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
      Effect.mapError((error) => `Bootstrap error: ${JSON.stringify(error)}`)
    ),
}).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeLib.runFork(WorkerRunner.launch(WorkerLive));
