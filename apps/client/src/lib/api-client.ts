import { FetchHttpClient, HttpApiClient } from "@effect/platform";
import { ServerApi } from "@local/api";
import { Effect } from "effect";
import { LoroDoc, LoroMap, type LoroList } from "loro-crdt";
import type { UserTable } from "./schema";

export class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
  dependencies: [FetchHttpClient.layer],
  effect: Effect.gen(function* () {
    const client = yield* HttpApiClient.make(ServerApi, {
      baseUrl: "http://localhost:3000",
    });

    const push = (users: readonly UserTable[]) =>
      Effect.gen(function* () {
        const doc = new LoroDoc<{
          user: LoroList<LoroMap<typeof UserTable.Encoded>>;
        }>();
        const list = doc.getList("user");

        users.forEach((user, index) => {
          const map = new LoroMap<typeof UserTable.Encoded>();
          map.set("userId", user.userId);
          map.set("name", user.name);
          list.insertContainer(index, map);
        });

        return yield* client.user.createUser({
          payload: {
            name: crypto.randomUUID(),
            snapshot: doc.export({ mode: "snapshot" }),
          },
        });
      });

    const pull = Effect.gen(function* () {
      const user = yield* client.user.getUser({ path: { id: 3 } });
      const doc = new LoroDoc<{
        user: LoroList<LoroMap<typeof UserTable.Encoded>>;
      }>();
      doc.import(user.snapshot!);
      console.log(doc, doc.toJSON());

      return doc.getList("user").toJSON() as UserTable[];
    });

    return { push, pull };
  }),
}) {}
