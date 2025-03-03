import {
  Authorization,
  ClientId,
  DatabaseError,
  MissingWorkspace,
  Unauthorized,
  WorkspaceId,
} from "@local/sync";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { Array, Effect, Layer, Match, Redacted, Schema } from "effect";
import { tokenTable, workspaceTable } from "../db/schema";
import { Drizzle } from "../services/drizzle";
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

          yield* query({
            Request: Schema.Struct({
              workspaceId: WorkspaceId,
              clientId: ClientId,
            }),
            execute: (db, { workspaceId, clientId }) =>
              db
                .select()
                .from(tokenTable)
                .where(
                  and(
                    eq(tokenTable.workspaceId, workspaceId),
                    eq(tokenTable.clientId, clientId),
                    or(
                      isNull(tokenTable.revokedAt),
                      gt(tokenTable.revokedAt, new Date())
                    ),
                    or(
                      isNull(tokenTable.expiresAt),
                      gt(tokenTable.expiresAt, new Date())
                    )
                  )
                )
                .orderBy(desc(tokenTable.issuedAt))
                .limit(1),
          })({
            workspaceId: tokenPayload.workspaceId,
            clientId: tokenPayload.sub,
          }).pipe(
            Effect.flatMap(Array.head),
            Effect.tapError(Effect.logError),
            Effect.mapError(
              () =>
                new Unauthorized({
                  message: "Missing, expired, or revoked token",
                })
            )
          );

          return yield* query({
            Request: Schema.Struct({
              workspaceId: Schema.UUID,
            }),
            execute: (db, { workspaceId }) =>
              db
                .select()
                .from(workspaceTable)
                .where(eq(workspaceTable.workspaceId, workspaceId))
                .orderBy(desc(workspaceTable.createdAt))
                .limit(1),
          })({ workspaceId: tokenPayload.workspaceId }).pipe(
            Effect.flatMap(Array.head)
          );
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
