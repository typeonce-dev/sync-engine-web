import { HttpApiBuilder } from "@effect/platform";
import { SqlClient } from "@effect/sql";
import { ServerApi, User } from "@local/api";
import { eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { DatabaseLive } from "./database";
import { usersTable } from "./db/schema";
import { Drizzle } from "./drizzle";

export const UserGroupLive = HttpApiBuilder.group(
  ServerApi,
  "user",
  (handlers) =>
    handlers
      .handle("createUser", ({ payload }) =>
        Effect.gen(function* () {
          const { query } = yield* Drizzle;

          const InsertPerson = query({
            Request: User.pipe(Schema.pick("name", "snapshot")),
            Result: Schema.Array(User),
            execute: async (db, { name, snapshot }) =>
              db
                .insert(usersTable)
                .values({ name, snapshot: snapshot ? [...snapshot] : null })
                .returning()
                .execute(),
          });

          return yield* InsertPerson({
            name: payload.name,
            snapshot: payload.snapshot,
          });
        }).pipe(
          Effect.tapError(Effect.logError),
          Effect.mapError((error) => error.message)
        )
      )
      .handle("getUser", ({ path }) =>
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const { query } = yield* Drizzle;

          const GetById = query({
            Request: Schema.Number,
            Result: Schema.Array(User),
            execute: async (db, id) =>
              db
                .select()
                .from(usersTable)
                .where(eq(usersTable.id, id))
                .limit(1)
                .execute(),
          });

          return yield* GetById(path.id).pipe(Effect.map((users) => users[0]!));
        }).pipe(
          Effect.tapError(Effect.logError),
          Effect.mapError((error) => error.message)
        )
      )
).pipe(Layer.provide([DatabaseLive, Drizzle.Default]));
