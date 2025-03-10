import { SnapshotSchema, type LoroSchema } from "@local/schema";
import { Effect } from "effect";
import { LoroDoc } from "loro-crdt";
import { TempWorkspace } from "./temp-workspace";
import { WorkspaceManager } from "./workspace-manager";

export class LoroStorage extends Effect.Service<LoroStorage>()("LoroStorage", {
  accessors: true,
  dependencies: [TempWorkspace.Default, WorkspaceManager.Default],
  effect: Effect.gen(function* () {
    const manager = yield* WorkspaceManager;
    const temp = yield* TempWorkspace;

    const load = ({ workspaceId }: { workspaceId: string }) =>
      Effect.all(
        {
          workspace: manager.getById({ workspaceId }),
          tempWorkspace: temp.getById({ workspaceId }),
        },
        { concurrency: "unbounded" }
      ).pipe(
        Effect.map(({ workspace, tempWorkspace }) => {
          const doc = SnapshotSchema.EmptyDoc();

          if (workspace !== undefined) {
            doc.import(workspace.snapshot);
          }

          if (tempWorkspace !== undefined) {
            doc.import(tempWorkspace.snapshot);
          }

          return { doc, workspace };
        })
      );

    const query = <A>(
      extract: (doc: LoroDoc<LoroSchema>) => A,
      { workspaceId }: { workspaceId: string }
    ) => load({ workspaceId }).pipe(Effect.map(({ doc }) => extract(doc)));

    return { load, query } as const;
  }),
}) {}
