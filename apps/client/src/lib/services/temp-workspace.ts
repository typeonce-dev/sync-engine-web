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
        put: (params: typeof TempWorkspaceTable.Type) =>
          Schema.encode(TempWorkspaceTable)(params).pipe(
            Effect.flatMap((data) => query((_) => _.temp_workspace.put(data)))
          ),

        get: ({ workspaceId }: { workspaceId: string }) =>
          query((_) =>
            _.temp_workspace
              .where("workspaceId")
              .equals(workspaceId)
              .limit(1)
              .first()
          ).pipe(
            Effect.flatMap(Effect.fromNullable),
            Effect.flatMap(Schema.decode(TempWorkspaceTable))
          ),

        clean: ({ workspaceId }: { workspaceId: string }) =>
          query((_) =>
            _.temp_workspace.where("workspaceId").equals(workspaceId).delete()
          ),
      };
    }),
  }
) {}
