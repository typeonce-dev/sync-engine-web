import { PgClient } from "@effect/sql-pg";
import { Config } from "effect";

export const DatabaseLive = PgClient.layerConfig({
  password: Config.redacted("POSTGRES_PW"),
  username: Config.succeed("postgres"),
  database: Config.succeed("postgres"),
  host: Config.succeed("localhost"),
  port: Config.succeed(5435),
});
