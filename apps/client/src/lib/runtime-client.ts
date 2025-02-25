import { Layer, ManagedRuntime } from "effect";
import { ApiClient } from "./api-client";
import { Dexie } from "./dexie";
import { TempWorkspace } from "./services/temp-workspace";
import { WorkspaceManager } from "./services/workspace-manager";

const MainLayer = Layer.mergeAll(
  Dexie.Default,
  ApiClient.Default,
  WorkspaceManager.Default,
  TempWorkspace.Default
);

export const RuntimeClient = ManagedRuntime.make(MainLayer);
