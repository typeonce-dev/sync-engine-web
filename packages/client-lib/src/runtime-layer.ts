import { Layer } from "effect";
import { ApiClient } from "./services/api-client";
import { Dexie } from "./services/dexie";
import { LoroStorage } from "./services/loro-storage";
import { Migration } from "./services/migration";
import { Sync } from "./services/sync";
import { TempWorkspace } from "./services/temp-workspace";
import { WorkspaceManager } from "./services/workspace-manager";
import { SyncWorker } from "./sync-worker";

export const RuntimeLayer = Layer.mergeAll(
  Dexie.Default,
  ApiClient.Default,
  WorkspaceManager.Default,
  TempWorkspace.Default,
  LoroStorage.Default,
  Sync.Default,
  Migration.Default,
  SyncWorker.Default
);
