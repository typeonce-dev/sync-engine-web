import { NodeContext } from "@effect/platform-node";
import { PgMigrator } from "@effect/sql-pg";
import { Layer } from "effect";
import { fileURLToPath } from "node:url";
import { DatabaseLive } from "./database";

export const MigratorLive = PgMigrator.layer({
  // Where to put the `_schema.sql` file
  schemaDirectory: "src/migrations",
  loader: PgMigrator.fromFileSystem(
    fileURLToPath(new URL("migrations", import.meta.url))
  ),
}).pipe(Layer.provide([DatabaseLive, NodeContext.layer]));
