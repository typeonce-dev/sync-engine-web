import { createFileRoute } from "@tanstack/react-router";
import { Duration, Effect } from "effect";
import { ApiClient } from "../../lib/api-client";
import { WEBSITE_URL } from "../../lib/constants";
import { RuntimeClient } from "../../lib/runtime-client";
import { WorkspaceManager } from "../../lib/services/workspace-manager";
import { useActionEffect } from "../../lib/use-action-effect";

export const Route = createFileRoute("/$workspaceId/token")({
  component: RouteComponent,
  loader: ({ params: { workspaceId } }) =>
    RuntimeClient.runPromise(
      Effect.gen(function* () {
        const api = yield* ApiClient;
        const token = yield* WorkspaceManager.getById({ workspaceId }).pipe(
          Effect.flatMap((workspace) => Effect.fromNullable(workspace?.token))
        );

        const tokens = yield* api.client.syncAuth.listTokens({
          path: { workspaceId },
          headers: { "x-api-key": token },
        });

        return { tokens, token };
      })
    ),
});

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const { tokens, token } = Route.useLoaderData();

  const [, onIssueToken, issuing] = useActionEffect((formData: FormData) =>
    Effect.gen(function* () {
      const api = yield* ApiClient;

      const clientId = formData.get("clientId") as string;

      yield* api.client.syncAuth.issueToken({
        path: { workspaceId },
        headers: { "x-api-key": token },
        payload: {
          clientId,
          expiresIn: Duration.days(30),
          scope: "read_write",
        },
      });
    })
  );

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
            <th>expiresAt</th>
            <th>revokedAt</th>
            <th>Share</th>
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
              <td>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${WEBSITE_URL}/${workspaceId}/join`
                    )
                  }
                >
                  Share
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={onIssueToken}>
        <input type="text" name="clientId" />
        <button type="submit" disabled={issuing}>
          Issue token
        </button>
      </form>
    </div>
  );
}
