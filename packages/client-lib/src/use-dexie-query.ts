import { useLiveQuery } from "dexie-react-hooks";
import { Data, Effect, Either, Match, pipe, Schema } from "effect";
import { type LoroList, type LoroMap } from "loro-crdt";
import { Dexie } from "./services/dexie";

class MissingData extends Data.TaggedError("MissingData")<{}> {}
class DexieError extends Data.TaggedError("DexieError")<{
  reason: "invalid-data" | "query-error";
  cause: unknown;
}> {}

export const useDexieQuery = <A, I extends Record<string, unknown>>(
  query: (db: (typeof Dexie.Service)["db"]) => Promise<LoroList<LoroMap<I>>>,
  schema: Schema.Schema<A, I>,
  deps: unknown[] = []
) => {
  const results = useLiveQuery(
    () =>
      Effect.runPromise(
        Effect.gen(function* () {
          const { db } = yield* Dexie;
          return yield* Effect.tryPromise({
            try: () => query(db),
            catch: (cause) => new DexieError({ reason: "query-error", cause }),
          });
        }).pipe(Effect.either, Effect.provide(Dexie.Default))
      ),
    deps
  );

  return pipe(
    results,
    Either.fromNullable(() => new MissingData()),
    Either.flatMap(
      Either.match({
        onLeft: Either.left,
        onRight: (container) =>
          pipe(
            Schema.decodeEither(Schema.Array(schema))(container.toJSON()),
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
