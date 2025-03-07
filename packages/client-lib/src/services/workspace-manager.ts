import { SnapshotSchema } from "@local/schema";
import { Snapshot } from "@local/sync";
import { Effect, Schema } from "effect";
import { WorkspaceTable } from "../schema";
import { Dexie } from "./dexie";

export class WorkspaceManager extends Effect.Service<WorkspaceManager>()(
  "WorkspaceManager",
  {
    accessors: true,
    dependencies: [Dexie.Default],
    effect: Effect.gen(function* () {
      const { query } = yield* Dexie;

      return {
        setToken: ({
          token,
          workspaceId,
        }: {
          workspaceId: typeof WorkspaceTable.Type.workspaceId;
          token: NonNullable<typeof WorkspaceTable.Type.token>;
        }) => query((_) => _.workspace.update(workspaceId, { token })),

        put: (update: typeof WorkspaceTable.Type) =>
          Schema.encode(WorkspaceTable)(update).pipe(
            Effect.flatMap((data) => query((_) => _.workspace.put(data)))
          ),

        getAll: query((_) => _.workspace.toArray()),

        getById: ({ workspaceId }: { workspaceId: string }) =>
          query((_) =>
            _.workspace
              .where("workspaceId")
              .equals(workspaceId)
              .limit(1)
              .first()
          ).pipe(
            Effect.flatMap((workspace) =>
              workspace === undefined
                ? Effect.succeed(undefined)
                : Schema.decode(WorkspaceTable)(workspace)
            )
          ),

        create: query((_) =>
          _.workspace.toCollection().modify({ current: false })
        ).pipe(
          Effect.andThen(
            Schema.encode(Snapshot)(
              SnapshotSchema.EmptyDoc().export({
                mode: "snapshot",
              })
            )
          ),
          Effect.flatMap((snapshot) =>
            query((_) =>
              _.workspace.put({
                snapshot,
                token: null,
                version: null,
                workspaceId: crypto.randomUUID(),
              })
            )
          ),
          Effect.map((workspaceId) => ({ workspaceId }))
        ),
      };
    }),
  }
) {}
