import * as _Dexie from "dexie";
import { Data, Effect, Schema } from "effect";
import { type UserTable } from "./schema";

class WriteApiError extends Data.TaggedError("WriteApiError")<{
  cause: unknown;
}> {}

const formDataToRecord = (formData: FormData): Record<string, string> => {
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      record[key] = value;
    }
  }
  return record;
};

export class Dexie extends Effect.Service<Dexie>()("Dexie", {
  accessors: true,
  effect: Effect.gen(function* () {
    const db = new _Dexie.Dexie("_db") as _Dexie.Dexie & {
      user: _Dexie.EntityTable<typeof UserTable.Encoded, "userId">;
    };

    db.version(1).stores({
      user: "++userId, &name",
    });

    const formAction =
      <const R extends string, I, T>(
        source: Schema.Schema<I, Record<R, string>>,
        exec: (values: Readonly<I>) => Promise<T>
      ) =>
      (formData: FormData) =>
        Schema.decodeUnknown(source)(formDataToRecord(formData)).pipe(
          Effect.mapError((error) => new WriteApiError({ cause: error })),
          Effect.flatMap((values) =>
            Effect.tryPromise({
              try: () => exec(values),
              catch: (error) => new WriteApiError({ cause: error }),
            })
          )
        );

    const changeAction =
      <A, I, T>(
        source: Schema.Schema<A, I>,
        exec: (values: Readonly<A>) => Promise<T>
      ) =>
      (params: I) =>
        Schema.decode(source)(params).pipe(
          Effect.tap(Effect.log),
          Effect.mapError((error) => new WriteApiError({ cause: error })),
          Effect.flatMap((values) =>
            Effect.tryPromise({
              try: () => exec(values),
              catch: (error) => new WriteApiError({ cause: error }),
            })
          )
        );

    return {
      db,

      insertUser: formAction(
        Schema.Struct({ name: Schema.NonEmptyString }),
        ({ name }) => db.user.add({ userId: crypto.randomUUID(), name })
      ),

      updateUser: changeAction(
        Schema.Struct({
          userId: Schema.UUID,
          name: Schema.NonEmptyString,
        }),

        ({ userId, name }) => db.user.update(userId, { name })
      ),
    };
  }),
}) {}
