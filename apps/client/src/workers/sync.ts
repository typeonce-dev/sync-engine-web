import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import type { LoroSchema } from "@local/schema";
import { Effect, Layer } from "effect";
import { LoroDoc } from "loro-crdt";
import { RuntimeClient } from "../lib/runtime-client";
import { Sync } from "../lib/services/sync";
import { TempWorkspace } from "../lib/services/temp-workspace";
import { WorkspaceManager } from "../lib/services/workspace-manager";
import { WorkerMessage } from "./schema";

const WorkerLive = WorkerRunner.layerSerialized(WorkerMessage, {
  Bootstrap: (params) =>
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
        const docI = new LoroDoc<LoroSchema>();
        docI.import(tempUpdates.snapshot);
        yield* Effect.log("Doc", docI.toJSON());

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
    }).pipe(Effect.mapError(() => "Bootstrap error")),
}).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeClient.runFork(WorkerRunner.launch(WorkerLive));
