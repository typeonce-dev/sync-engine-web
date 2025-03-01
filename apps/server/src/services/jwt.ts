import { Scope } from "@local/sync";
import { Config, Data, Effect, Redacted, Schema } from "effect";
import * as jwt from "jsonwebtoken";

class TokenPayload extends Schema.Class<TokenPayload>("TokenPayload")({
  iat: Schema.Number,
  exp: Schema.optional(Schema.Number),
  sub: Schema.String,
  workspaceId: Schema.String,
  scope: Scope,
  isMaster: Schema.Boolean,
}) {}

class JwtError extends Data.TaggedError("JwtError")<{
  reason: "missing" | "invalid";
}> {}

export class Jwt extends Effect.Service<Jwt>()("Jwt", {
  effect: Effect.gen(function* () {
    const secretKey = yield* Config.redacted("JWT_SECRET");
    return {
      sign: ({
        clientId,
        workspaceId,
      }: {
        clientId: string;
        workspaceId: string;
      }) =>
        jwt.sign(
          new TokenPayload({
            iat: Math.floor(Date.now() / 1000),
            sub: clientId,
            workspaceId,
            scope: "read_write",
            isMaster: true,
          }),
          Redacted.value(secretKey),
          { algorithm: "HS256" }
        ),

      decode: ({ apiKey }: { apiKey: Redacted.Redacted<string> }) =>
        Effect.gen(function* () {
          const decoded = jwt.decode(Redacted.value(apiKey));

          if (decoded === null) {
            return yield* new JwtError({ reason: "missing" });
          }

          return yield* Schema.decodeUnknown(TokenPayload)(decoded).pipe(
            Effect.mapError(() => new JwtError({ reason: "invalid" }))
          );
        }),
    };
  }),
}) {}
