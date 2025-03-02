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
        return yield* initClient;
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
