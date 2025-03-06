import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { Dexie } from "../lib/dexie";
import { RuntimeClient } from "../lib/runtime-client";

export const Route = createRootRoute({
  component: RootComponent,
  loader: () =>
    RuntimeClient.runPromise(
      Effect.gen(function* () {
        const { initClient } = yield* Dexie;
        // const { migrate } = yield* Migration;

        const clientId = yield* initClient;
        // yield* migrate;
        return clientId;
      })
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
