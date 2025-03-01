import {
  Authorization,
  DatabaseError,
  MissingWorkspace,
  Unauthorized,
} from "@local/sync";
import { and, desc, eq } from "drizzle-orm";
import { Array, Effect, Layer, Match, Redacted, Schema } from "effect";
import { workspaceTable } from "../db/schema";
import { Drizzle } from "../drizzle";
import { Jwt } from "../services/jwt";

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const jwt = yield* Jwt;
    const { query } = yield* Drizzle;
    yield* Effect.log("Creating Authorization middleware");
    return {
      apiKey: (apiKey) =>
        Effect.gen(function* () {
          yield* Effect.log("Api key", Redacted.value(apiKey));

          const tokenPayload = yield* jwt.decode({ apiKey });

          yield* Effect.log(`Valid auth ${tokenPayload.workspaceId}`);

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
        }).pipe(
          Effect.mapError((error) =>
            Match.value(error).pipe(
              Match.tagsExhaustive({
                NoSuchElementException: () => new MissingWorkspace(),
                JwtError: () => new Unauthorized(),
                ParseError: () => new Unauthorized(),
                QueryError: () => new DatabaseError(),
              })
            )
          )
        ),
    };
  })
).pipe(Layer.provide([Drizzle.Default, Jwt.Default]));
