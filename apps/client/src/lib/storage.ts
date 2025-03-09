import { Service } from "@local/client-lib";
import { SnapshotSchema } from "@local/schema";
import { Effect, Schema } from "effect";
import { LoroMap, VersionVector } from "loro-crdt";

export class Storage extends Effect.Service<Storage>()("Storage", {
  dependencies: [Service.TempWorkspace.Default, Service.LoroStorage.Default],
  effect: Effect.gen(function* () {
    const temp = yield* Service.TempWorkspace;
    const { load } = yield* Service.LoroStorage;

    const insertFood = ({
      workspaceId,
      value,
    }: {
      workspaceId: string;
      value: typeof SnapshotSchema.fields.food.value.Type;
    }) =>
      Effect.gen(function* () {
        const { doc, workspace } = yield* load({ workspaceId });

        const list = doc.getList("food");

        const container = list.insertContainer(list.length, new LoroMap());

        const food = yield* Schema.encode(SnapshotSchema.fields.food.value)(
          value
        );

        Object.entries(food).forEach(([key, val]) => {
          container.set(
            key as keyof typeof SnapshotSchema.fields.food.value.Type,
            val
          );
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

    return { insertFood };
  }),
}) {}
