import { useLiveQuery } from "dexie-react-hooks";
import { Data, Effect, Either, flow, Match, pipe, Schema } from "effect";
import { RuntimeLib } from "./runtime-lib";
import { Dexie } from "./services/dexie";

class DexieError extends Data.TaggedError("DexieError")<{
  reason: "invalid-data" | "query-error";
  cause: unknown;
}> {}
class MissingData extends Data.TaggedError("MissingData")<{}> {}

export const useDexieQuery = <A, I>(
  query: (db: (typeof Dexie.Service)["db"]) => Promise<I[]>,
  schema: Schema.Schema<A, I>,
  deps: unknown[] = []
) => {
  const results = useLiveQuery(
    () =>
      RuntimeLib.runPromise(
        Effect.gen(function* () {
          const { db } = yield* Dexie;
          return yield* Effect.tryPromise({
            try: () => query(db),
            catch: (cause) => new DexieError({ reason: "query-error", cause }),
          });
        }).pipe(Effect.either)
      ),
    deps
  );

  return pipe(
    results,
    Either.fromNullable(() => new MissingData()),
    Either.flatMap(
      Either.match({
        onLeft: Either.left,
        onRight: flow(
          Schema.decodeEither(Schema.Array(schema)),
          Either.mapLeft(
            (cause) => new DexieError({ reason: "invalid-data", cause })
          )
        ),
      })
    ),
    Either.match({
      onLeft: (_) =>
        Match.value(_).pipe(
          Match.tagsExhaustive({
            DexieError: (error) => ({
              error,
              loading: false as const,
              data: undefined,
            }),
            MissingData: (_) => ({
              loading: true as const,
              data: undefined,
              error: undefined,
            }),
          })
        ),
      onRight: (rows) => ({
        data: rows,
        loading: false as const,
        error: undefined,
      }),
    })
  );
};
