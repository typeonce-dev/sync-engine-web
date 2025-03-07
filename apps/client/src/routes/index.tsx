import { RuntimeLib, Service, useActionEffect } from "@local/client-lib";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Effect } from "effect";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  loader: () => RuntimeLib.runPromise(Service.WorkspaceManager.getAll),
});

function HomeComponent() {
  const allWorkspaces = Route.useLoaderData();
  const navigate = useNavigate();

  const [, joinWorkspace] = useActionEffect(() =>
    Effect.gen(function* () {
      const workspace = yield* Service.WorkspaceManager.create;
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

      <div>
        <button type="button" onClick={joinWorkspace}>
          Create workspace
        </button>
      </div>
    </div>
  );
}
