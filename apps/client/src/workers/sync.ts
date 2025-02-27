import { WorkerRunner } from "@effect/platform";
import { BrowserWorkerRunner } from "@effect/platform-browser";
import { Effect, Layer } from "effect";
import { LoroDoc } from "loro-crdt";
import { ApiClient } from "../lib/api-client";
import { Dexie } from "../lib/dexie";
import { RuntimeClient } from "../lib/runtime-client";
import { TempWorkspace } from "../lib/services/temp-workspace";
import { WorkspaceManager } from "../lib/services/workspace-manager";
import { WorkerMessage } from "./schema";

const WorkerLive = WorkerRunner.layerSerialized(WorkerMessage, {
  Bootstrap: (params) =>
    Effect.gen(function* () {
      const { client } = yield* ApiClient;
      const { initClient } = yield* Dexie;

      const manager = yield* WorkspaceManager;
      const temp = yield* TempWorkspace;

      yield* Effect.log(`Running workspace '${params.workspaceId}'`);

      const workspace = yield* manager
        .getById({ workspaceId: params.workspaceId })
        .pipe(
          Effect.flatMap(Effect.fromNullable),
          Effect.mapError(() => "Get workspace error")
        );

      const clientId = yield* initClient.pipe(
        Effect.mapError(() => "Init client error")
      );

      const tempUpdates = yield* temp
        .getById({ workspaceId: workspace.workspaceId })
        .pipe(Effect.mapError(() => "Get temp workspace error"));

      if (tempUpdates !== undefined) {
        const response = yield* Effect.fromNullable(workspace.token).pipe(
          Effect.flatMap((token) =>
            client.syncData
              .push({
                // headers: { Authorization: `Bearer ${token}` },
                path: { workspaceId: workspace.workspaceId },
                payload: { clientId, snapshot: tempUpdates.snapshot },
              })
              .pipe(
                Effect.map((response) => ({ ...response, token })),
                Effect.mapError(() => "Sync push error")
              )
          ),
          Effect.orElse(() =>
            client.syncAuth
              .generateToken({
                payload: {
                  clientId,
                  snapshot: tempUpdates.snapshot,
                  workspaceId: params.workspaceId,
                },
              })
              .pipe(
                Effect.tap(({ token }) =>
                  manager.setToken({
                    workspaceId: workspace.workspaceId,
                    token,
                  })
                ),
                Effect.mapError(() => "Generate token error")
              )
          )
        );

        const doc = new LoroDoc();
        doc.import(response.snapshot);

        yield* manager
          .put({
            workspaceId: response.workspaceId,
            snapshot: response.snapshot,
            token: response.token,
            version: doc.version().encode(),
          })
          .pipe(Effect.mapError(() => "Put workspace error"));

        yield* temp
          .clean({ workspaceId: workspace.workspaceId })
          .pipe(Effect.mapError(() => "Clean temp workspace error"));

        yield* Effect.log("Sync completed");
      } else {
        yield* Effect.log("No sync updates");
      }

      return true;
    }),
}).pipe(Layer.provide(BrowserWorkerRunner.layer));

RuntimeClient.runFork(WorkerRunner.launch(WorkerLive));
