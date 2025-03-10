import { Service } from "@local/client-lib";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Effect } from "effect";
import { RuntimeClient } from "../../lib/runtime-client";

export const Route = createFileRoute("/$workspaceId/join")({
  component: RouteComponent,
  loader: ({ params }) =>
    RuntimeClient.runPromise(
      Effect.gen(function* () {
        const { join } = yield* Service.Sync;
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
