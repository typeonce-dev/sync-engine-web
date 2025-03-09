import { ParseResult, Schema } from "effect";
import { LoroDoc, LoroMap } from "loro-crdt";
import { VERSION } from "./main";
import { AnyLoroDocSchema, type ActivityV1, type ActivityV2 } from "./schema";
import { Version } from "./versioning";

const migrations = {
  1: (doc) => {
    doc.getMap("metadata").set("version", VERSION);
    doc.getList("activity");
    return doc;
  },

  2: (doc) => {
    doc.getMap("metadata").set("version", 2);

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

  3: (doc) => {
    doc.getMap("metadata").set("version", 3);

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
      const currentVersion = doc.getMap("metadata").get("version");

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
