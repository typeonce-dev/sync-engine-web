import { RuntimeLib, Service, useActionEffect } from "@local/client-lib";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Duration, Effect } from "effect";
import { WEBSITE_URL } from "../../lib/constants";

export const Route = createFileRoute("/$workspaceId/token")({
  component: RouteComponent,
  loader: ({ params: { workspaceId } }) =>
    RuntimeLib.runPromise(
      Effect.gen(function* () {
        const api = yield* Service.ApiClient;
        const token = yield* Service.WorkspaceManager.getById({
          workspaceId,
        }).pipe(
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
  const router = useRouter();

  const [, onIssueToken, issuing] = useActionEffect((formData: FormData) =>
    Effect.gen(function* () {
      const api = yield* Service.ApiClient;

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

      yield* Effect.promise(() => router.invalidate({ sync: true }));
    })
  );

  const [, onRevoke, revoking] = useActionEffect((formData: FormData) =>
    Effect.gen(function* () {
      const api = yield* Service.ApiClient;

      const clientId = formData.get("clientId") as string;

      yield* api.client.syncAuth.revokeToken({
        path: { workspaceId, clientId },
        headers: { "x-api-key": token },
      });

      yield* Effect.promise(() => router.invalidate({ sync: true }));
    })
  );

  return (
    <div>
      <Link to={`/$workspaceId`} params={{ workspaceId }}>
        Back
      </Link>
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
                {token.revokedAt ? (
                  <span>
                    {new Date(token.revokedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                ) : (
                  <form action={onRevoke}>
                    <input
                      type="hidden"
                      name="clientId"
                      value={token.clientId}
                    />
                    <button type="submit" disabled={revoking}>
                      Revoke access
                    </button>
                  </form>
                )}
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
