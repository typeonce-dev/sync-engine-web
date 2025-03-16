import { Worker } from "@effect/platform";
import { BrowserWorker } from "@effect/platform-browser";
import { Service, SyncWorker, useActionEffect } from "@local/client-lib";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Effect } from "effect";
import { startTransition, useEffect } from "react";
import { useFood } from "../../lib/hooks/use-food";
import { useMeal } from "../../lib/hooks/use-meal";
import { RuntimeClient } from "../../lib/runtime-client";
import { Storage } from "../../lib/services/storage";

const bootstrap = ({ workspaceId }: { workspaceId: string }) =>
  Effect.gen(function* () {
    const pool = yield* Worker.makePoolSerialized({ size: 1 });
    return yield* pool.broadcast(new SyncWorker.Bootstrap({ workspaceId }));
  }).pipe(
    Effect.scoped,
    Effect.provide(
      BrowserWorker.layer(
        () =>
          new globalThis.Worker(
            new URL("./src/workers/bootstrap.ts", globalThis.origin),
            { type: "module" }
          )
      )
    ),
    Effect.catchAll((error) => Effect.logError("Bootstrap error", error))
  );

export const Route = createFileRoute("/$workspaceId/")({
  component: RouteComponent,
  loader: ({ params: { workspaceId } }) =>
    RuntimeClient.runPromise(
      Service.WorkspaceManager.getById({ workspaceId }).pipe(
        Effect.flatMap(Effect.fromNullable),
        Effect.tap(({ workspaceId }) => bootstrap({ workspaceId }))
      )
    ),
});

function RouteComponent() {
  const workspace = Route.useLoaderData();

  const { data, error, loading } = useFood({
    workspaceId: workspace.workspaceId,
  });

  const { data: meals } = useMeal({
    workspaceId: workspace.workspaceId,
  });

  const [, onBootstrap, bootstrapping] = useActionEffect(
    RuntimeClient,
    bootstrap
  );

  const [, onAddFood] = useActionEffect(RuntimeClient, (formData: FormData) =>
    Effect.gen(function* () {
      const loroStorage = yield* Storage;

      const name = formData.get("name") as string;
      const calories = formData.get("calories") as string;

      yield* loroStorage.insertFood({
        workspaceId: workspace.workspaceId,
        value: {
          id: crypto.randomUUID(),
          name,
          calories: parseInt(calories, 10),
        },
      });
    })
  );

  const [, onAddMeal] = useActionEffect(RuntimeClient, (formData: FormData) =>
    Effect.gen(function* () {
      const loroStorage = yield* Storage;

      const foodId = formData.get("foodId") as string;
      const quantity = formData.get("quantity") as string;

      yield* loroStorage.insertMeal({
        workspaceId: workspace.workspaceId,
        value: {
          id: crypto.randomUUID(),
          foodId,
          quantity: parseInt(quantity, 10),
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
          new SyncWorker.LiveQuery({ workspaceId: workspace.workspaceId })
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

      <form action={onAddFood}>
        <input type="text" name="name" />
        <input type="number" name="calories" min={1} />
        <button type="submit">Add food</button>
      </form>

      <div>
        {loading && <p>Loading...</p>}
        {error && <pre>{JSON.stringify(error, null, 2)}</pre>}
        {(data ?? []).map((food) => (
          <div key={food.id}>
            <p>Name: {food.name}</p>
            <p>Calories: {food.calories}</p>
          </div>
        ))}
      </div>

      <form action={onAddMeal}>
        {(data ?? []).map((food) => (
          <div key={food.id}>
            <input type="radio" name="foodId" id={food.id} value={food.id} />
            <label htmlFor={food.id}>{food.name}</label>
          </div>
        ))}
        <input type="number" name="quantity" min={1} />
        <button type="submit">Add meal</button>
      </form>

      <div>
        {(meals ?? []).map((meal) => (
          <div key={meal.id}>
            <p>Food: {meal.food?.name}</p>
            <p>Quantity: {meal.quantity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
