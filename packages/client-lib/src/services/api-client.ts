import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { SyncApi } from "@local/sync";
import { Effect } from "effect";

export class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
  dependencies: [FetchHttpClient.layer],
  effect: Effect.gen(function* () {
    const client = yield* HttpApiClient.make(SyncApi, {
      baseUrl: "http://localhost:3000",
    });

    return { client };
  }),
}) {}
