import { Schema } from "effect";
import { LoroDoc, LoroList, LoroMap } from "loro-crdt";

export class Activity extends Schema.Class<Activity>("Activity")({
  id: Schema.UUID,
  name: Schema.String,
}) {}

export type LoroSchema = {
  activity: LoroList<LoroMap<typeof Activity.Encoded>>;
};

export class SnapshotSchema extends Schema.Class<SnapshotSchema>(
  "SnapshotSchema"
)({
  activity: Schema.Array(Activity),
}) {
  static readonly EmptyDoc = () => {
    const doc = new LoroDoc<LoroSchema>();
    doc.getList("activity");
    return doc;
  };
}

export const SnapshotToLoroDoc = Schema.Uint8ArrayFromSelf.pipe(
  Schema.transform(Schema.instanceOf(LoroDoc<LoroSchema>), {
    decode: (from) => {
      const doc = new LoroDoc<LoroSchema>();
      doc.import(from);
      return doc;
    },
    encode: (to) => to.export({ mode: "snapshot" }),
  })
);
