import { Data, Effect, Redacted, Schema } from "effect";
import { DatabaseUrl } from "./database";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";

class MigrationError extends Data.TaggedError("MigrationError")<{
  cause: unknown;
}> {}

class QueryError extends Data.TaggedError("QueryError")<{
  cause: unknown;
}> {}

export class Drizzle extends Effect.Service<Drizzle>()("Drizzle", {
  effect: Effect.gen(function* () {
    const databaseUrl = yield* DatabaseUrl;
    const db = drizzle(Redacted.value(databaseUrl));

    yield* Effect.log("Applying migrations").pipe(
      Effect.andThen(
        Effect.tryPromise({
          try: () =>
            migrate(db, {
              migrationsFolder: fileURLToPath(
                new URL("../drizzle", import.meta.url)
              ),
            }),
          catch: (error) => new MigrationError({ cause: error }),
        })
      ),
      Effect.tap(() => Effect.log("Migrations applied"))
    );

    const query =
      <RQI, RQA, RSI, RSA>({
        Request,
        Result,
        execute,
      }: {
        Request: Schema.Schema<RQA, RQI>;
        Result: Schema.Schema<RSA, RSI>;
        execute: (_: typeof db, __: RQA) => Promise<RSI>;
      }) =>
      (params: RQI) =>
        Schema.decode(Request)(params).pipe(
          Effect.flatMap((_) =>
            Effect.tryPromise({
              try: () => execute(db, _),
              catch: (error) => new QueryError({ cause: error }),
            })
          ),
          Effect.flatMap(Schema.decode(Result))
        );
    return { db, query };
  }),
}) {}
