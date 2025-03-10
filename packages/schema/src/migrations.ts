import { ParseResult, Schema } from "effect";
import { LoroDoc } from "loro-crdt";
import { SnapshotSchema } from "./main";
import { AnyLoroDocSchema } from "./schema";
import { Version } from "./versioning";

const migrations = {
  1: (_) => SnapshotSchema.EmptyDoc(),
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
