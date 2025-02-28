import { Activity, type LoroSchema } from "@local/sync/loro";
import { Effect, Schema } from "effect";
import { LoroDoc, LoroMap, VersionVector } from "loro-crdt";
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
          const doc = new LoroDoc<LoroSchema>();

          if (workspace !== undefined) {
            doc.import(workspace.snapshot);
          }

          if (tempWorkspace !== undefined) {
            doc.import(tempWorkspace.snapshot);
          }

          return { doc, workspace };
        })
      );

    const insert = ({
      workspaceId,
      value,
    }: {
      workspaceId: string;
      value: typeof Activity.Type;
    }) =>
      Effect.gen(function* () {
        const { doc, workspace } = yield* load({ workspaceId });

        const list = doc.getList("activity");

        const container = doc
          .getList("activity")
          .insertContainer(list.length, new LoroMap());

        const activity = yield* Schema.encode(Activity)(value);

        Object.entries(activity).forEach(([key, val]) => {
          container.set(key as keyof typeof Activity.Type, val);
        });

        const snapshotExport =
          workspace === undefined
            ? doc.export({ mode: "snapshot" })
            : doc.export({
                mode: "update",
                from: new VersionVector(workspace.version),
              });

        return yield* temp.put({
          workspaceId,
          snapshot: snapshotExport,
          snapshotId: crypto.randomUUID(),
        });
      });

    return {
      insertActivity: insert,
    };
  }),
}) {}
