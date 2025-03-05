import { createFileRoute, redirect } from "@tanstack/react-router";
import { Effect } from "effect";
import { RuntimeClient } from "../../lib/runtime-client";
import { Sync } from "../../lib/services/sync";

export const Route = createFileRoute("/$workspaceId/join")({
  component: RouteComponent,
  loader: ({ params }) =>
    RuntimeClient.runPromise(
      Effect.gen(function* () {
        const { join } = yield* Sync;
        yield* join({ workspaceId: params.workspaceId });
        return redirect({
          to: `/$workspaceId`,
          params: { workspaceId: params.workspaceId },
        });
      })
    ),
});

function RouteComponent() {
  return null;
}
