import { Effect } from "effect";
import { Dexie } from "../dexie";

export class WorkspaceManager extends Effect.Service<WorkspaceManager>()(
  "WorkspaceManager",
  {
    accessors: true,
    dependencies: [Dexie.Default],
    effect: Effect.gen(function* () {
      const { query } = yield* Dexie;

      return {
        getAll: query((_) => _.workspace.toArray()),

        getById: ({ workspaceId }: { workspaceId: string }) =>
          query((_) =>
            _.workspace
              .where("workspaceId")
              .equals(workspaceId)
              .limit(1)
              .first()
          ).pipe(Effect.flatMap(Effect.fromNullable)),

        putCurrent: (workspaceId: string | undefined) =>
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
