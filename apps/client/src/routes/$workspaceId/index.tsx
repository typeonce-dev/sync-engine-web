import { Worker } from "@effect/platform";
import { BrowserWorker } from "@effect/platform-browser";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Effect } from "effect";
import { startTransition, useEffect } from "react";
import { useActivity } from "../../lib/hooks/use-activity";
import { useMetadata } from "../../lib/hooks/use-metadata";
import { RuntimeClient } from "../../lib/runtime-client";
import { LoroStorage } from "../../lib/services/loro-storage";
import { WorkspaceManager } from "../../lib/services/workspace-manager";
import { useActionEffect } from "../../lib/use-action-effect";
import { Bootstrap, LiveQuery } from "../../workers/schema";

const bootstrap = ({ workspaceId }: { workspaceId: string }) =>
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
  );

export const Route = createFileRoute("/$workspaceId/")({
  component: RouteComponent,
  loader: ({ params: { workspaceId } }) =>
    RuntimeClient.runPromise(
      WorkspaceManager.getById({ workspaceId }).pipe(
        Effect.flatMap(Effect.fromNullable),
        Effect.tap(({ workspaceId }) => bootstrap({ workspaceId }))
      )
    ),
});

function RouteComponent() {
  const workspace = Route.useLoaderData();

  const { data: metadata } = useMetadata({
    workspaceId: workspace.workspaceId,
  });
  const { data, error, loading } = useActivity({
    workspaceId: workspace.workspaceId,
  });

  const [, onBootstrap, bootstrapping] = useActionEffect(bootstrap);
  const [, onAdd] = useActionEffect((formData: FormData) =>
    Effect.gen(function* () {
      const loroStorage = yield* LoroStorage;

      const firstName = formData.get("firstName") as string;
      const lastName = formData.get("lastName") as string;

      yield* loroStorage.insertActivity({
        workspaceId: workspace.workspaceId,
        value: {
          id: crypto.randomUUID(),
          firstName,
          lastName,
        },
      });
    })
  );

  useEffect(() => {
    const url = new URL("./src/workers/live.ts", globalThis.origin);
    const newWorker = new globalThis.Worker(url, { type: "module" });

    void RuntimeClient.runPromise(
      Effect.gen(function* () {
        const pool = yield* Worker.makePoolSerialized({ size: 1 });
        return yield* pool.broadcast(
          new LiveQuery({ workspaceId: workspace.workspaceId })
        );
      }).pipe(
        Effect.scoped,
        Effect.provide(BrowserWorker.layer(() => newWorker))
      )
    );

    newWorker.onerror = (error) => {
      console.error("Live query worker error", error);
    };

    return () => {
      newWorker.terminate();
    };
  }, []);

  return (
    <div>
      <pre>{JSON.stringify(metadata)}</pre>
      <Link
        to="/$workspaceId/token"
        params={{ workspaceId: workspace.workspaceId }}
      >
        Tokens
      </Link>

      <p>{workspace.workspaceId}</p>
      <button
        disabled={bootstrapping}
        onClick={() =>
          startTransition(() =>
            onBootstrap({ workspaceId: workspace.workspaceId })
          )
        }
      >
        {bootstrapping ? "Bootstrapping..." : "Bootstrap"}
      </button>

      <form action={onAdd}>
        <input type="text" name="firstName" />
        <input type="text" name="lastName" />
        <button type="submit">Add activity</button>
      </form>

      <div>
        {loading && <p>Loading...</p>}
        {error && <pre>{JSON.stringify(error, null, 2)}</pre>}
        {(data ?? []).map((activity) => (
          <div key={activity.id}>
            <p>First name: {activity.firstName}</p>
            <p>Last name: {activity.lastName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
