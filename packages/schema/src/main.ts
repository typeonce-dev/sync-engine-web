import { Schema } from "effect";
import { LoroDoc, LoroList, LoroMap } from "loro-crdt";
import { ActivitySchema, AnyLoroDocSchema } from "./schema";
import type { Version } from "./versioning";

export const VERSION = 3 satisfies Version;

export const Metadata = Schema.Struct({ version: Schema.Number });
export const Activity = ActivitySchema[VERSION];

export type LoroSchema = {
  metadata: LoroMap<typeof Metadata.Encoded>;
  activity: LoroList<LoroMap<typeof Activity.Encoded>>;
};

export class SnapshotSchema extends Schema.Class<SnapshotSchema>(
  "SnapshotSchema"
)({
  metadata: Metadata,
  activity: Schema.Array(Activity),
}) {
  static readonly EmptyDoc = () => {
    const doc = new LoroDoc<LoroSchema>();
    doc.getMap("metadata").set("version", VERSION);
    doc.getList("activity");
    return doc;
  };
}

export const SnapshotToLoroDoc = Schema.Uint8ArrayFromSelf.pipe(
  Schema.transform(AnyLoroDocSchema, {
    decode: (from) => {
      const doc = new LoroDoc();
      doc.import(from);
      return doc;
    },
    encode: (to) => to.export({ mode: "snapshot" }),
  })
);
