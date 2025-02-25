import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Effect } from "effect";
import { RuntimeClient } from "../lib/runtime-client";
import { WorkspaceManager } from "../lib/services/workspace-manager";
import { useActionEffect } from "../lib/use-action-effect";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  loader: () => RuntimeClient.runPromise(WorkspaceManager.getAll),
});

function HomeComponent() {
  const allWorkspaces = Route.useLoaderData();
  const navigate = useNavigate();

  const [, joinWorkspace] = useActionEffect((formData: FormData | undefined) =>
    Effect.gen(function* () {
      const workspaceId = formData?.get("workspaceId") as string | null;
      const workspace = yield* WorkspaceManager.createOrJoin(
        workspaceId ?? undefined
      );
      yield* Effect.sync(() =>
        navigate({
          to: `/$workspaceId`,
          params: { workspaceId: workspace.workspaceId },
        })
      );
    })
  );

  return (
    <div>
      <p>Select workspace</p>
      {allWorkspaces.map((workspace) => (
        <Link
          key={workspace.workspaceId}
          to="/$workspaceId"
          params={{ workspaceId: workspace.workspaceId }}
        >
          {workspace.workspaceId}
        </Link>
      ))}

      <form action={joinWorkspace}>
        <input type="text" name="workspaceId" placeholder="Workspace id" />
        <button type="submit">Switch workspace</button>
      </form>

      <div>
        <button type="button" onClick={() => joinWorkspace(undefined)}>
          Create workspace
        </button>
      </div>
    </div>
  );
}
