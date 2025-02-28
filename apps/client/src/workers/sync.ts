import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { Effect, Layer } from "effect";
import { RuntimeClient } from "../lib/runtime-client";
import { Sync } from "../lib/services/sync";
import { TempWorkspace } from "../lib/services/temp-workspace";
import { WorkspaceManager } from "../lib/services/workspace-manager";
import { WorkerMessage } from "./schema";

const WorkerLive = WorkerRunner.layerSerialized(WorkerMessage, {
  Bootstrap: (params) =>
    Effect.gen(function* () {
      const { push } = yield* Sync;

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
          workspace,
          snapshot: tempUpdates.snapshot,
          snapshotId: tempUpdates.snapshotId,
        });
        yield* Effect.log("Sync completed");
      } else {
        yield* Effect.log("No sync updates");
      }

      return true;
    }).pipe(Effect.mapError(() => "Bootstrap error")),
}).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeClient.runFork(WorkerRunner.launch(WorkerLive));
