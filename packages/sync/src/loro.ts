import { Effect, ParseResult, Schema } from "effect";
import { LoroDoc, LoroList, LoroMap } from "loro-crdt";

export type LoroSchema = {
  activity: LoroList<LoroMap<typeof Activity.Encoded>>;
};

export class Activity extends Schema.Class<Activity>("Activity")({
  id: Schema.UUID,
  name: Schema.String,
}) {}

export class SnapshotSchema extends Schema.Class<SnapshotSchema>(
  "SnapshotSchema"
)({
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
export const SnapshotToLoroDoc = Schema.Uint8ArrayFromSelf.pipe(
  Schema.transformOrFail(Schema.instanceOf(LoroDoc<LoroSchema>), {
    decode: (from, _, ast) =>
      Effect.gen(function* () {
        const doc = new LoroDoc<LoroSchema>();
        doc.import(from);

        // TODO: This?
        yield* Schema.decodeUnknown(SnapshotSchema)(doc.toJSON());

        return doc;
      }).pipe(
        Effect.mapError(
          (error) => new ParseResult.Type(ast, from, error.message)
        )
      ),

    encode: (to, _, ast) =>
      Schema.encode(Snapshot)(to.export({ mode: "snapshot" })).pipe(
        Effect.flatMap(Schema.decode(Snapshot)),
        Effect.mapError((error) => new ParseResult.Type(ast, to, error.message))
      ),
  })
);

// const swap = <A, I, R>(
//   schema: Schema.Schema<A, I, R>
// ): Schema.Schema<I, A, R> =>
//   Schema.transformOrFail(
//     Schema.typeSchema(schema),
//     Schema.encodedSchema(schema),
//     {
//       decode: ParseResult.encode(schema),
//       encode: ParseResult.decode(schema),
//     }
//   );

// export const LoroDocSchema = Schema.compose( LoroSchemaTransform, Snapshot);
