import { Service } from "@local/client-lib";
import { CurrentSchema, SnapshotSchema } from "@local/schema";
import { Effect, Schema } from "effect";
import { LoroMap, VersionVector } from "loro-crdt";

export class Storage extends Effect.Service<Storage>()("Storage", {
  dependencies: [Service.TempWorkspace.Default, Service.LoroStorage.Default],
  effect: Effect.gen(function* () {
    const temp = yield* Service.TempWorkspace;
    const { load } = yield* Service.LoroStorage;

    const insert =
      <T extends typeof SnapshotSchema.Table.Type>(table: T) =>
      ({
        workspaceId,
        value,
      }: {
        workspaceId: string;
        value: Schema.Schema.Encoded<(typeof CurrentSchema.fields)[T]>[number];
      }) =>
        Effect.gen(function* () {
          const { doc, workspace } = yield* load({ workspaceId });

          const list = doc.getList(table);

          const container = list.insertContainer(list.length, new LoroMap());

          const data = yield* Schema.encode(
            CurrentSchema.fields[table].value as Schema.Schema<typeof value>
          )(value);

          Object.entries(data).forEach(([key, val]) => {
            container.set(key, val);
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
      insertFood: insert("food"),
      insertMeal: insert("meal"),
    } as const;
  }),
}) {}
