import { PgClient } from "@effect/sql-pg";
import { Config, Effect, Layer, Redacted } from "effect";

const password = Config.redacted("POSTGRES_PASSWORD");
const username = Config.string("POSTGRES_USERNAME");
const database = Config.string("POSTGRES_DATABASE");
const host = Config.string("POSTGRES_HOST");
const port = Config.number("POSTGRES_PORT");

export const DatabaseUrl = Config.all({
  username,
  password,
  host,
  port,
  database,
}).pipe(
  Config.map(({ username, password, host, port, database }) =>
    Redacted.make(
      `postgresql://${username}:${Redacted.value(password)}@${host}:${port}/${database}`
    )
  )
);

export const DatabaseLive = DatabaseUrl.pipe(
  Effect.tap((url) =>
    Effect.log(`Connecting to database: ${Redacted.value(url)}`)
  ),
  Effect.map((url) => PgClient.layer({ url })),
  Layer.unwrapEffect
);
