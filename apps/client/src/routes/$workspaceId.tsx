import { Worker } from "@effect/platform";
import { BrowserWorker } from "@effect/platform-browser";
import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { startTransition } from "react";
import { useActivity } from "../lib/hooks/use-activity";
import { RuntimeClient } from "../lib/runtime-client";
import { LoroStorage } from "../lib/services/loro-storage";
import { WorkspaceManager } from "../lib/services/workspace-manager";
import { useActionEffect } from "../lib/use-action-effect";
import { Bootstrap } from "../workers/schema";

export const Route = createFileRoute("/$workspaceId")({
  component: RouteComponent,
  loader: ({ params: { workspaceId } }) =>
    RuntimeClient.runPromise(
      WorkspaceManager.getById({ workspaceId }).pipe(
        Effect.flatMap(Effect.fromNullable)
      )
    ),
});

function RouteComponent() {
  const workspace = Route.useLoaderData();

  const { data, error, loading } = useActivity({
    workspaceId: workspace.workspaceId,
  });

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

  const [, onAdd] = useActionEffect((formData: FormData) =>
    Effect.gen(function* () {
      const loroStorage = yield* LoroStorage;

      const name = formData.get("name") as string;

      yield* loroStorage.insertActivity({
        workspaceId: workspace.workspaceId,
        value: {
          id: crypto.randomUUID(),
          name,
        },
      });
    })
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

      <form action={onAdd}>
        <input type="text" name="name" />
        <button type="submit">Add activity</button>
      </form>

      <div>
        {loading && <p>Loading...</p>}
        {error && <pre>{JSON.stringify(error, null, 2)}</pre>}
        {(data ?? []).map((activity) => (
          <div key={activity.id}>
            <label>Name {activity.name}</label>
          </div>
        ))}
      </div>
    </div>
  );
}
