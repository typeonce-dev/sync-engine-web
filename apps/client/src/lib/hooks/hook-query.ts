import { SnapshotSchema, type LoroSchema } from "@local/schema";
import { Effect, Schema } from "effect";
import { LoroDoc } from "loro-crdt";
import { TempWorkspace } from "../services/temp-workspace";
import { WorkspaceManager } from "../services/workspace-manager";

export const hookQuery = ({ workspaceId }: { workspaceId: string }) =>
  Effect.gen(function* () {
    const temp = yield* TempWorkspace;
    const manager = yield* WorkspaceManager;

    const workspace = yield* manager.getById({ workspaceId });

    const tempWorkspace = yield* temp.getById({ workspaceId });

    const doc = new LoroDoc<LoroSchema>();
    if (workspace) {
      doc.import(workspace.snapshot);
    }
    if (tempWorkspace) {
      doc.import(tempWorkspace.snapshot);
    }

    const json = doc.toJSON() as unknown;
    return yield* Schema.decodeUnknown(SnapshotSchema)(json);
  });
