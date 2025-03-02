import { Effect } from "effect";
import { LoroDoc } from "loro-crdt";
import { ApiClient } from "../api-client";
import { Dexie } from "../dexie";
import type { WorkspaceTable } from "../schema";
import { TempWorkspace } from "./temp-workspace";
import { WorkspaceManager } from "./workspace-manager";

export class Sync extends Effect.Service<Sync>()("Sync", {
  dependencies: [
    TempWorkspace.Default,
    WorkspaceManager.Default,
    ApiClient.Default,
    Dexie.Default,
  ],
  effect: Effect.gen(function* () {
    const { client } = yield* ApiClient;
    const { initClient } = yield* Dexie;
    const manager = yield* WorkspaceManager;
    const temp = yield* TempWorkspace;

    return {
      push: ({
        snapshot,
        workspace,
        snapshotId,
      }: {
        workspace: WorkspaceTable;
        snapshotId: string;
        snapshot: globalThis.Uint8Array;
      }) =>
        Effect.gen(function* () {
          const clientId = yield* initClient;
          yield* Effect.log(`Pushing snapshot ${snapshotId}`);

          const response = yield* Effect.fromNullable(workspace.token).pipe(
            Effect.flatMap((token) =>
              client.syncData
                .push({
                  headers: { "x-api-key": token },
                  path: { workspaceId: workspace.workspaceId },
                  payload: { snapshot, snapshotId },
                })
                .pipe(
                  Effect.map((response) => ({
                    ...response,
                    token,
                  }))
                )
            ),
            Effect.catchTag("NoSuchElementException", () =>
              client.syncAuth
                .generateToken({
                  payload: {
                    clientId,
                    snapshot,
                    snapshotId,
                    workspaceId: workspace.workspaceId,
                  },
                })
                .pipe(
                  Effect.tap(({ token }) =>
                    manager.setToken({
                      workspaceId: workspace.workspaceId,
                      token,
                    })
                  )
                )
            )
          );

          const doc = new LoroDoc();
          doc.import(response.snapshot);
          yield* Effect.all([
            manager.put({
              workspaceId: response.workspaceId,
              snapshot: response.snapshot,
              token: response.token,
              version: doc.version().encode(),
            }),
            temp.clean({
              workspaceId: workspace.workspaceId,
            }),
          ]);
        }),

      pull: ({ workspaceId }: { workspaceId: string }) =>
        Effect.gen(function* () {
          const clientId = yield* initClient;
          yield* Effect.log(`Pulling from ${workspaceId}`);

          const response = yield* client.syncData.pull({
            path: { workspaceId, clientId },
          });

          const doc = new LoroDoc();
          doc.import(response.snapshot);
          yield* manager.put({
            workspaceId: response.workspaceId,
            snapshot: response.snapshot,
            token: response.token,
            version: doc.version().encode(),
          });
        }),
    };
  }),
}) {}
