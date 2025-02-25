import { createFileRoute } from "@tanstack/react-router";
import { RuntimeClient } from "../lib/runtime-client";
import { WorkspaceManager } from "../lib/services/workspace-manager";

export const Route = createFileRoute("/$workspaceId")({
  component: RouteComponent,
  loader: ({ params: { workspaceId } }) =>
    RuntimeClient.runPromise(WorkspaceManager.getById({ workspaceId })),
});

function RouteComponent() {
  const workspace = Route.useLoaderData();
  return <div>Hello {workspace.workspaceId}</div>;
}
