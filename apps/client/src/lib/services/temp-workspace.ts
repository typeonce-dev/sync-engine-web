import { Effect, Schema } from "effect";
import { Dexie } from "../dexie";
import { TempWorkspaceTable } from "../schema";

export class TempWorkspace extends Effect.Service<TempWorkspace>()(
  "TempWorkspace",
  {
    dependencies: [Dexie.Default],
    effect: Effect.gen(function* () {
      const { query } = yield* Dexie;
      return {
        getAll: query((_) => _.temp_workspace.toArray()).pipe(
          Effect.flatMap(Schema.decode(Schema.Array(TempWorkspaceTable)))
        ),

        put: (params: typeof TempWorkspaceTable.Type) =>
          Schema.encode(TempWorkspaceTable)(params).pipe(
            Effect.flatMap((data) => query((_) => _.temp_workspace.put(data)))
          ),

        getById: ({ workspaceId }: { workspaceId: string }) =>
          query((_) =>
            _.temp_workspace
              .where("workspaceId")
              .equals(workspaceId)
              .limit(1)
              .first()
          ).pipe(
            Effect.flatMap((workspace) =>
              workspace === undefined
                ? Effect.succeed(undefined)
                : Schema.decode(TempWorkspaceTable)(workspace)
            )
          ),

        clean: ({ workspaceId }: { workspaceId: string }) =>
          query((_) =>
            _.temp_workspace.where("workspaceId").equals(workspaceId).delete()
          ),
      };
    }),
  }
) {}
