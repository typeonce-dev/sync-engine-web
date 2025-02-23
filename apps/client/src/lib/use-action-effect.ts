import { Effect, type ManagedRuntime } from "effect";
import { useActionState } from "react";
import { RuntimeClient } from "./runtime-client";

export const useActionEffect = <Payload, A, E>(
  effect: (
    payload: Payload
  ) => Effect.Effect<
    A,
    E,
    ManagedRuntime.ManagedRuntime.Context<typeof RuntimeClient>
  >
) => {
  return useActionState<
    | { error: E; data: null }
    | { error: null; data: A }
    | { error: null; data: null },
    Payload
  >(
    (_, payload) =>
      RuntimeClient.runPromise(
        effect(payload).pipe(
          Effect.match({
            onFailure: (error) => ({ error, data: null }),
            onSuccess: (data) => ({ error: null, data }),
          })
        )
      ),
    { error: null, data: null }
  );
};
