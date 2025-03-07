import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { Dexie } from "../lib/dexie";
import { RuntimeClient } from "../lib/runtime-client";
import { Migration } from "../lib/services/migration";

export const Route = createRootRoute({
  component: RootComponent,
  loader: () =>
    RuntimeClient.runPromise(
      Migration.pipe(
        Effect.flatMap((migration) => migration.migrate),
        Effect.catchAll((error) => Effect.logError("Migration error", error)),
        Effect.andThen(
          Effect.gen(function* () {
            const { initClient } = yield* Dexie;
            return yield* initClient;
          })
        )
      )
    ),
});

function RootComponent() {
  const clientId = Route.useLoaderData();
  return (
    <>
      <nav>
        <span>{clientId}</span>
      </nav>
      <Outlet />
    </>
  );
}
