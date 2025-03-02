import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { ApiClient } from "../../lib/api-client";
import { RuntimeClient } from "../../lib/runtime-client";
import { WorkspaceManager } from "../../lib/services/workspace-manager";

export const Route = createFileRoute("/$workspaceId/token")({
  component: RouteComponent,
  loader: ({ params: { workspaceId } }) =>
    RuntimeClient.runPromise(
      Effect.gen(function* () {
        const api = yield* ApiClient;
        const token = yield* WorkspaceManager.getById({ workspaceId }).pipe(
          Effect.flatMap((workspace) => Effect.fromNullable(workspace?.token))
        );

        return yield* api.client.syncAuth.listTokens({
          path: { workspaceId },
          headers: { "x-api-key": token },
        });
      })
    ),
});

function RouteComponent() {
  const tokens = Route.useLoaderData();
  return (
    <div>
      <h1>Tokens</h1>
      <table>
        <thead>
          <tr>
            <th>Index</th>
            <th>clientId</th>
            <th>isMaster</th>
            <th>scope</th>
            <th>issuedAt</th>
            <th>expired</th>
            <th>revoked</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, index) => (
            <tr key={index}>
              <td>{index}</td>
              <td>{token.clientId}</td>
              <td>{token.isMaster ? "✔️" : "❌"}</td>
              <td>{token.scope}</td>
              <td>
                {new Date(token.issuedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </td>
              <td>
                {token.expiresAt
                  ? new Date(token.expiresAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </td>
              <td>
                {token.revokedAt
                  ? new Date(token.revokedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
