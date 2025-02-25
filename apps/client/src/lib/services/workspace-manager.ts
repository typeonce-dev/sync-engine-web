import { Effect, Schema } from "effect";
import { Dexie } from "../dexie";
import { WorkspaceTable } from "../schema";

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
          ).pipe(Effect.flatMap(Effect.fromNullable)),

        createOrJoin: (workspaceId: string | undefined) =>
          query((_) =>
            _.workspace.toCollection().modify({ current: false })
          ).pipe(
            Effect.andThen(
              query((_) =>
                _.workspace.put({
                  workspaceId: workspaceId ?? crypto.randomUUID(),
                  version: [],
                  snapshot: [],
                  token: null,
                })
              )
            ),
            Effect.map((workspaceId) => ({ workspaceId }))
          ),
      };
    }),
  }
) {}
