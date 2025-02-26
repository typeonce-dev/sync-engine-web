import { Effect, ParseResult, Schema } from "effect";
import { LoroDoc, LoroList, LoroMap } from "loro-crdt";

type LoroSchema = {
  activity: LoroList<LoroMap<typeof Activity.Encoded>>;
};

class Activity extends Schema.Class<Activity>("Activity")({
  id: Schema.UUID,
  name: Schema.String,
}) {}

class SnapshotSchema extends Schema.Class<SnapshotSchema>("SnapshotSchema")({
  activity: Schema.Array(Activity),
}) {}

const SnapshotSchemaTransform = Schema.instanceOf(LoroDoc<LoroSchema>).pipe(
  Schema.transformOrFail(SnapshotSchema, {
    decode: (from, _, ast) =>
      Schema.decodeUnknown(SnapshotSchema)(from.toJSON()).pipe(
        Effect.mapError(
          (error) => new ParseResult.Type(ast, from, error.message)
        )
      ),

    encode: (to) => {
      const doc = new LoroDoc<LoroSchema>();
      const activity = doc.getList("activity");
      for (let i = 0; i < to.activity.length; i++) {
        const item = to.activity[i];
        if (item !== undefined) {
          const map = activity.get(i);

          for (const [key, value] of Object.entries(item)) {
            // Unsafe!
            map.set(key as keyof typeof item, value);
          }
        }
      }
      return ParseResult.succeed(doc);
    },
  })
);

export const Snapshot = Schema.Uint8Array;
export const LoroSchemaTransform = Schema.instanceOf(LoroDoc<LoroSchema>).pipe(
  Schema.transformOrFail(Snapshot, {
    decode: (from, _, ast) =>
      Schema.encode(Snapshot)(from.export({ mode: "snapshot" })).pipe(
        Effect.mapError(
          (error) => new ParseResult.Type(ast, from, error.message)
        )
      ),

    encode: (to, _, ast) =>
      Schema.decode(Snapshot)(to).pipe(
        Effect.flatMap((data) =>
          Effect.gen(function* () {
            const doc = new LoroDoc<LoroSchema>();
            doc.import(data);
            yield* Schema.decodeUnknown(SnapshotSchema)(doc.toJSON());
            return doc;
          })
        ),
        Effect.mapError((error) => new ParseResult.Type(ast, to, error.message))
      ),
  })
);
