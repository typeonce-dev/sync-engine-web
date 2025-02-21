import { HttpApiBuilder } from "@effect/platform";
import { SqlClient, SqlResolver } from "@effect/sql";
import { ServerApi, User } from "@local/api";
import { Effect, flow, Function, Layer, Schema } from "effect";
import { DatabaseLive } from "./database";

export const UserGroupLive = HttpApiBuilder.group(
  ServerApi,
  "user",
  (handlers) =>
    handlers
      .handle("createUser", ({ payload }) =>
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;

          const InsertPerson = yield* SqlResolver.ordered("InsertPerson", {
            Request: User.pipe(Schema.omit("id", "created_at")),
            Result: User,
            execute: (requests) =>
              sql`INSERT INTO "user" ${sql.insert(requests)} RETURNING *`,
          });

          return yield* InsertPerson.execute({ name: payload.name });
        }).pipe(
          Effect.tapError(Effect.logError),
          Effect.mapError((error) => error.message)
        )
      )
      .handle("getUser", ({ path }) =>
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;

          const GetById = yield* SqlResolver.findById("GetUserById", {
            Id: Schema.Number,
            Result: User,
            ResultId: (_) => _.id,
            execute: (ids) =>
              sql`SELECT * FROM "user" WHERE ${sql.in("id", ids)}`,
          });

          const getById = flow(
            GetById.execute,
            Effect.withRequestCaching(true)
          );

          return yield* getById(path.id).pipe(
            Effect.flatMap(Function.identity)
          );
        }).pipe(
          Effect.tapError(Effect.logError),
          Effect.mapError((error) => error.message)
        )
      )
).pipe(Layer.provide(DatabaseLive));
