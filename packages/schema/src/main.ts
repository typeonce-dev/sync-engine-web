import { Schema } from "effect";
import { LoroDoc, LoroList, LoroMap } from "loro-crdt";
import { AnyLoroDocSchema, Table, VersioningSchema } from "./schema";
import type { Version } from "./versioning";

export const VERSION = 1 satisfies Version;
export const CurrentSchema = VersioningSchema[VERSION];

const Metadata = Schema.Struct({ version: Schema.Number });

export type LoroSchema = {
  metadata: LoroMap<Partial<typeof Metadata.Encoded>>;
  food: LoroList<LoroMap<typeof CurrentSchema.fields.food.value.Encoded>>;
  meal: LoroList<LoroMap<typeof CurrentSchema.fields.meal.value.Encoded>>;
};

export class SnapshotSchema extends Schema.Class<SnapshotSchema>(
  "SnapshotSchema"
)({
  metadata: Metadata,
  ...CurrentSchema.fields,
}) {
  static readonly Table = Table;

  static readonly EmptyDoc = () => {
    const doc = new LoroDoc<LoroSchema>();
    doc.getMap("metadata").set("version", VERSION);
    Table.literals.map((key) => {
      doc.getList(key);
    });
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
