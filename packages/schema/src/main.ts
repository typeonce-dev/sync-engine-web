import { ParseResult, Schema } from "effect";
import { LoroDoc, LoroList, LoroMap } from "loro-crdt";
import { ActivitySchema, ActivityV1, type ActivityV2 } from "./schema";

const Version = [1, 2, 3] as const;
export type Version = (typeof Version)[number];

export const VERSION = 3 satisfies Version;

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

const migrations = {
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
  "3": (doc) => {
    const metadata = doc.getMap("metadata");
    metadata.set("version", 3);

    const activity = doc.getList("activity");
    for (let i = 0; i < activity.length; i++) {
      const item = activity.get(i) as LoroMap<typeof ActivityV2.Encoded>;
      const map = new LoroMap();
      map.set("id", item.get("id"));
      map.set("firstName", item.get("firstName"));
      map.set("lastName", item.get("lastName"));
      map.set("age", undefined);
      activity.insertContainer(i, map);
    }

    return doc;
  },
} satisfies Record<Version, (doc: LoroDoc) => LoroDoc>;

export const LoroDocMigration = AnyLoroDocSchema.pipe(
  Schema.transformOrFail(AnyLoroDocSchema, {
    decode: (from, _, ast) => {
      const doc = new LoroDoc();
      doc.import(from.export({ mode: "snapshot" }));
      const metadata = doc.getMap("metadata");
      const currentVersion = metadata.get("version");

      if (typeof currentVersion === "number") {
        Version.forEach((version) => {
          doc.import(migrations[version](doc).export({ mode: "snapshot" }));
        });
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
