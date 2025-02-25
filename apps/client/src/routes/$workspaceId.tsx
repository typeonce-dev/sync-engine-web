import { Worker } from "@effect/platform";
import { BrowserWorker } from "@effect/platform-browser";
import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { startTransition } from "react";
import { RuntimeClient } from "../lib/runtime-client";
import { WorkspaceManager } from "../lib/services/workspace-manager";
import { useActionEffect } from "../lib/use-action-effect";
import { Bootstrap } from "../workers/schema";

export const Route = createFileRoute("/$workspaceId")({
  component: RouteComponent,
  loader: ({ params: { workspaceId } }) =>
    RuntimeClient.runPromise(WorkspaceManager.getById({ workspaceId })),
});

function RouteComponent() {
  const workspace = Route.useLoaderData();

  const [, bootstrap] = useActionEffect(
    ({ workspaceId }: { workspaceId: string }) =>
      Effect.gen(function* () {
        const pool = yield* Worker.makePoolSerialized({ size: 1 });
        return yield* pool.broadcast(new Bootstrap({ workspaceId }));
      }).pipe(
        Effect.scoped,
        Effect.provide(
          BrowserWorker.layer(
            () =>
              new globalThis.Worker(
                new URL("./src/workers/sync.ts", globalThis.origin),
                { type: "module" }
              )
          )
        )
      )
  );

  return (
    <div>
      <p>{workspace.workspaceId}</p>
      <button
        onClick={() =>
          startTransition(() =>
            bootstrap({ workspaceId: workspace.workspaceId })
          )
        }
      >
        Bootstrap
      </button>
    </div>
  );
}
