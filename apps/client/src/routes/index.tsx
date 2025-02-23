import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { useActionState } from "react";
import { ApiClient } from "../lib/api-client";
import { Dexie } from "../lib/dexie";
import { RuntimeClient } from "../lib/runtime-client";
import { useActionEffect } from "../lib/use-action-effect";
import { useUser } from "../lib/use-user";

export const Route = createFileRoute("/")({ component: HomeComponent });

function HomeComponent() {
  const { data } = useUser();
  const [, add] = useActionEffect(Dexie.insertUser);
  const [, push] = useActionState(
    () =>
      RuntimeClient.runPromise(
        Effect.gen(function* () {
          const api = yield* ApiClient;
          return yield* api.push(data ?? []);
        })
      ),
    null
  );
  const [user, pull] = useActionState(
    () =>
      RuntimeClient.runPromise(
        Effect.gen(function* () {
          const api = yield* ApiClient;
          return yield* api.pull;
        })
      ),
    null
  );
  return (
    <div>
      <button type="button" onClick={push}>
        Push
      </button>

      <button type="button" onClick={pull}>
        Pull
      </button>

      {user && (
        <div>
          {user.map((u) => (
            <p key={u.userId}>{u.name}</p>
          ))}
        </div>
      )}

      <form action={add}>
        <input type="text" name="name" />
        <button>Add</button>
      </form>

      <div>{data?.map((user) => <p key={user.userId}>{user.name}</p>)}</div>
    </div>
  );
}
