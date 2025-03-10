import { SnapshotSchema, type LoroSchema } from "@local/schema";
import { Effect, Schema } from "effect";
import { LoroDoc, type LoroList, type LoroMap } from "loro-crdt";
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

    const query = <A extends Record<string, unknown>>(
      extract: (doc: LoroDoc<LoroSchema>) => LoroList<LoroMap<A>>,
      schema: Schema.Schema<A>,
      { workspaceId }: { workspaceId: string }
    ) =>
      Effect.gen(function* () {
        const { doc } = yield* load({ workspaceId });
        const data = extract(doc);
        const list = data.toArray();
        return yield* Effect.all(
          list.map((item) => Schema.decode(schema)(item.toJSON() as A)),
          { concurrency: 10 }
        );
      });

    return { load, query } as const;
  }),
}) {}
