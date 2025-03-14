import { SnapshotToLoroDoc } from "@local/schema";
import { LoroDocMigration } from "@local/schema/migrations";
import { Data, Effect, Schema, type ParseResult } from "effect";
import { TempWorkspace } from "./temp-workspace";

class MigrationError extends Data.TaggedError("MigrationError")<{
  parseError: ParseResult.ParseError;
}> {}

export class Migration extends Effect.Service<Migration>()("Migration", {
  dependencies: [TempWorkspace.Default],
  effect: Effect.gen(function* () {
    const temp = yield* TempWorkspace;
    return {
      migrate: temp.getAll.pipe(
        Effect.tap((workspaces) =>
          Effect.log(`Migrating ${workspaces.length} workspaces`)
        ),
        Effect.flatMap((workspaces) =>
          Effect.all(
            workspaces.map((workspace) =>
              Effect.gen(function* () {
                const doc = yield* Schema.decode(SnapshotToLoroDoc)(
                  workspace.snapshot
                );

                yield* Effect.log(doc.toJSON());

                const newDoc = yield* Schema.decode(LoroDocMigration)(doc).pipe(
                  Effect.catchTag(
                    "ParseError",
                    (parseError) => new MigrationError({ parseError })
                  )
                );

                const newSnapshot =
                  yield* Schema.encode(SnapshotToLoroDoc)(newDoc);

                yield* temp.put({
                  workspaceId: workspace.workspaceId,
                  snapshot: newSnapshot,
                  snapshotId: workspace.snapshotId,
                });
              })
            )
          )
        ),
        Effect.tap(() =>
          Effect.log("Migration completed successfully for all workspaces")
        )
      ),
    };
  }),
}) {}
