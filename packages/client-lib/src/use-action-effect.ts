import { Effect, type ManagedRuntime } from "effect";
import { useActionState } from "react";

export const useActionEffect = <Payload, A, E, R>(
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
  effect: (payload: Payload) => Effect.Effect<A, E, R>
) => {
  return useActionState<
    | { error: E; data: null }
    | { error: null; data: A }
    | { error: null; data: null },
    Payload
  >(
    (_, payload) =>
      runtime.runPromise(
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
