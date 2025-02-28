import { Effect } from "effect";
import { ApiClient } from "../api-client";
import { Dexie } from "../dexie";
import type { WorkspaceTable } from "../schema";
import { TempWorkspace } from "./temp-workspace";
import { WorkspaceManager } from "./workspace-manager";
import { LoroDoc } from "loro-crdt";

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
      }: {
        workspace: WorkspaceTable;
        snapshot: globalThis.Uint8Array;
      }) =>
        Effect.gen(function* () {
          const clientId = yield* initClient;

          const response = yield* Effect.fromNullable(workspace.token).pipe(
            Effect.flatMap((token) =>
              client.syncData
                .push({
                  // headers: { Authorization: `Bearer ${token}` },
                  path: {
                    workspaceId: workspace.workspaceId,
                  },
                  payload: { clientId, snapshot },
                })
                .pipe(
                  Effect.map((response) => ({
                    ...response,
                    token,
                  }))
                )
            ),
            Effect.orElse(() =>
              client.syncAuth
                .generateToken({
                  payload: {
                    clientId,
                    snapshot,
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
    };
  }),
}) {}
