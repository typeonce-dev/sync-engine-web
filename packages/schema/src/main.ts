import { ParseResult, Schema } from "effect";
import { LoroDoc, LoroList, LoroMap } from "loro-crdt";
import { ActivitySchema, ActivityV1 } from "./schema";

export const VERSION = 2;

const AnyLoroDocSchema = Schema.instanceOf(LoroDoc);

export const Metadata = Schema.Struct({ version: Schema.Number });
export const Activity = ActivitySchema[VERSION];

export type LoroSchema = {
  metadata: LoroMap<{ version: number }>;
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

    const metadata = doc.getMap("metadata");
    metadata.set("version", VERSION);

    doc.getList("activity");

    return doc;
  };
}

const migrations: Record<number, (doc: LoroDoc) => LoroDoc> = {
  1: (doc) => {
    const metadata = doc.getMap("metadata");
    metadata.set("version", VERSION);

    doc.getList("activity");

    return doc;
  },
  2: (doc) => {
    const metadata = doc.getMap("metadata");
    metadata.set("version", 2);

    const activity = doc.getList("activity");
    for (let i = 0; i < activity.length; i++) {
      const item = activity.get(i) as LoroMap<typeof ActivityV1.Encoded>;
      const map = new LoroMap();
      const [firstName, lastName] = item.get("name").split(" ");
      map.set("id", item.get("id"));
      map.set("firstName", firstName);
      map.set("lastName", lastName);
      activity.insertContainer(i, map);
    }

    return doc;
  },
};

export const LoroDocMigration = AnyLoroDocSchema.pipe(
  Schema.transformOrFail(AnyLoroDocSchema, {
    decode: (from, _, ast) => {
      const doc = new LoroDoc();
      doc.import(from.export({ mode: "snapshot" }));
      const metadata = doc.getMap("metadata");
      const currentVersion = metadata.get("version");

      if (typeof currentVersion === "number") {
        for (let version = currentVersion + 1; version <= VERSION; version++) {
          const migration = migrations[version];
          if (migration === undefined) {
            return ParseResult.fail(
              new ParseResult.Type(
                ast,
                from,
                `Migration from version ${version - 1} to ${version} not found`
              )
            );
          }

          doc.import(migration(doc).export({ mode: "snapshot" }));
        }
      } else {
        return ParseResult.fail(
          new ParseResult.Type(ast, from, "Invalid version number in metadata")
        );
      }

      return ParseResult.succeed(doc);
    },

    encode: (to, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          to,
          "Encoding LoroDoc migration is not allowed (should not happen...)"
        )
      ),
  })
);

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
