import {
  DatabaseError,
  MasterAuthorization,
  MissingWorkspace,
  Unauthorized,
} from "@local/sync";
import { and, desc, eq } from "drizzle-orm";
import { Array, Effect, Layer, Match, Redacted, Schema } from "effect";
import { workspaceTable } from "../db/schema";
import { Drizzle } from "../services/drizzle";
import { Jwt } from "../services/jwt";

export const MasterAuthorizationLive = Layer.effect(
  MasterAuthorization,
  Effect.gen(function* () {
    const jwt = yield* Jwt;
    const { query } = yield* Drizzle;
    yield* Effect.log("Creating Master Authorization middleware");
    return {
      apiKey: (apiKey) =>
        Effect.gen(function* () {
          yield* Effect.log("Api key", Redacted.value(apiKey));

          const tokenPayload = yield* jwt.decode({ apiKey });

          if (tokenPayload.isMaster) {
            return yield* query({
              Request: Schema.Struct({
                workspaceId: Schema.UUID,
                clientId: Schema.UUID,
              }),
              execute: (db, { workspaceId, clientId }) =>
                db
                  .select()
                  .from(workspaceTable)
                  .where(
                    and(
                      eq(workspaceTable.workspaceId, workspaceId),
                      eq(workspaceTable.clientId, clientId)
                    )
                  )
                  .orderBy(desc(workspaceTable.createdAt))
                  .limit(1),
            })({
              clientId: tokenPayload.sub,
              workspaceId: tokenPayload.workspaceId,
            }).pipe(Effect.flatMap(Array.head));
          }

          return yield* new Unauthorized({ message: "Not master access" });
        }).pipe(
          Effect.mapError((error) =>
            Match.value(error).pipe(
              Match.tagsExhaustive({
                NoSuchElementException: () => new MissingWorkspace(),
                Unauthorized: (error) => error,
                JwtError: () => new Unauthorized({ message: "Invalid token" }),
                ParseError: () =>
                  new Unauthorized({ message: "Invalid parameters" }),
                QueryError: () => new DatabaseError(),
              })
            )
          )
        ),
    };
  })
).pipe(Layer.provide([Drizzle.Default, Jwt.Default]));
