import { Layer, ManagedRuntime } from "effect";
import { ApiClient } from "./api-client";
import { Dexie } from "./dexie";
import { LoroStorage } from "./services/loro-storage";
import { Migration } from "./services/migration";
import { Sync } from "./services/sync";
import { TempWorkspace } from "./services/temp-workspace";
import { WorkspaceManager } from "./services/workspace-manager";

const MainLayer = Layer.mergeAll(
  Dexie.Default,
  ApiClient.Default,
  WorkspaceManager.Default,
  TempWorkspace.Default,
  LoroStorage.Default,
  Sync.Default,
  Migration.Default
);

export const RuntimeClient = ManagedRuntime.make(MainLayer);
