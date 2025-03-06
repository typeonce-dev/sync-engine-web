import { HttpServerRequest } from "@effect/platform";
import { SnapshotToLoroDoc, VERSION } from "@local/schema";
import { Snapshot, VersionCheck, VersionError } from "@local/sync";
import { Effect, Layer, Schema } from "effect";

export const VersionCheckLive = Layer.effect(
  VersionCheck,
  Effect.gen(function* () {
    yield* Effect.log("Creating version check middleware");
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;

      yield* Effect.log("Checking version");

      const { snapshot } = yield* request.json.pipe(
        Effect.flatMap(
          Schema.decodeUnknown(
            Schema.Struct({
              snapshot: Snapshot,
            })
          )
        ),
        Effect.mapError(() => new VersionError({ reason: "missing-snapshot" }))
      );

      const doc = yield* Schema.decode(SnapshotToLoroDoc)(snapshot).pipe(
        Effect.mapError(() => new VersionError({ reason: "invalid-doc" }))
      );

      yield* Effect.log("Checking doc", doc.toJSON());

      const metadata = doc.getMap("metadata");
      const currentVersion = metadata.get("version");

      yield* Effect.log("Current version", currentVersion);

      if (typeof currentVersion !== "number") {
        return yield* new VersionError({ reason: "missing-version" });
      } else if (currentVersion !== VERSION) {
        return yield* new VersionError({ reason: "outdated-version" });
      }

      return snapshot;
    });
  })
);
