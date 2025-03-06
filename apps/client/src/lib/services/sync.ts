import type { LoroSchema } from "@local/schema";
import { Effect, flow, Option } from "effect";
import { LoroDoc } from "loro-crdt";
import { ApiClient } from "../api-client";
import { Dexie } from "../dexie";
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
        workspaceId,
        snapshotId,
      }: {
        workspaceId: string;
        snapshotId: string;
        snapshot: globalThis.Uint8Array;
      }) =>
        manager.getById({ workspaceId }).pipe(
          Effect.flatMap(
            flow(
              Option.fromNullable,
              Option.match({
                onNone: () => Effect.log("No workspace found"),
                onSome: (workspace) =>
                  Effect.gen(function* () {
                    const clientId = yield* initClient;
                    yield* Effect.log(`Pushing snapshot ${snapshotId}`);

                    const response = yield* Effect.fromNullable(
                      workspace.token
                    ).pipe(
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

                    const doc = new LoroDoc<LoroSchema>();
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
              })
            )
          )
        ),

      pull: ({ workspaceId }: { workspaceId: string }) =>
        manager.getById({ workspaceId }).pipe(
          Effect.flatMap(
            flow(
              Option.fromNullable,
              Option.flatMap((workspace) =>
                Option.fromNullable(workspace.token)
              ),
              Option.match({
                onNone: () =>
                  Effect.log("No token found").pipe(Effect.map(() => null)),
                onSome: (token) =>
                  Effect.gen(function* () {
                    yield* Effect.log(`Pulling from ${workspaceId}`);

                    const response = yield* client.syncData.pull({
                      headers: { "x-api-key": token },
                      path: { workspaceId },
                    });

                    const doc = new LoroDoc();
                    doc.import(response.snapshot);
                    yield* manager.put({
                      token,
                      workspaceId,
                      snapshot: response.snapshot,
                      version: doc.version().encode(),
                    });

                    return response;
                  }),
              })
            )
          )
        ),

      join: ({ workspaceId }: { workspaceId: string }) =>
        Effect.gen(function* () {
          const clientId = yield* initClient;
          const response = yield* client.syncData.join({
            path: { clientId, workspaceId },
          });

          const doc = new LoroDoc();
          doc.import(response.snapshot);
          yield* manager.put({
            workspaceId,
            token: response.token,
            snapshot: response.snapshot,
            version: doc.version().encode(),
          });

          return response;
        }),
    };
  }),
}) {}
