import { createFileRoute, redirect } from "@tanstack/react-router";
import { Effect } from "effect";
import { LoroDoc } from "loro-crdt";
import { ApiClient } from "../../lib/api-client";
import { Dexie } from "../../lib/dexie";
import { RuntimeClient } from "../../lib/runtime-client";
import { WorkspaceManager } from "../../lib/services/workspace-manager";

export const Route = createFileRoute("/$workspaceId/join")({
  component: RouteComponent,
  loader: ({ params }) =>
    RuntimeClient.runPromise(
      Effect.gen(function* () {
        const manager = yield* WorkspaceManager;
        const api = yield* ApiClient;
        const { initClient } = yield* Dexie;

        const clientId = yield* initClient;
        const workspace = yield* api.client.syncData.pull({
          path: { workspaceId: params.workspaceId, clientId },
        });

        const doc = new LoroDoc();
        doc.import(workspace.snapshot);
        const workspaceId = yield* manager.put({
          token: workspace.token,
          snapshot: workspace.snapshot,
          workspaceId: workspace.workspaceId,
          version: doc.version().encode(),
        });

        return redirect({
          to: `/$workspaceId`,
          params: { workspaceId },
        });
      })
    ),
});

function RouteComponent() {
  return null;
}
