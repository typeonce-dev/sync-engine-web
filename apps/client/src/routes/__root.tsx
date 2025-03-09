import { Service } from "@local/client-lib";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { RuntimeClient } from "../lib/runtime-client";

export const Route = createRootRoute({
  component: RootComponent,
  loader: () =>
    RuntimeClient.runPromise(
      Service.Migration.pipe(
        Effect.flatMap((migration) => migration.migrate),
        Effect.catchAll((error) => Effect.logError("Migration error", error)),
        Effect.andThen(
          Effect.gen(function* () {
            const { initClient } = yield* Service.Dexie;
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
