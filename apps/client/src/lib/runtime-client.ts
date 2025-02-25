import { Layer, ManagedRuntime } from "effect";
import { ApiClient } from "./api-client";
import { Dexie } from "./dexie";
import { WorkspaceManager } from "./services/workspace-manager";

const MainLayer = Layer.mergeAll(
  Dexie.Default,
  ApiClient.Default,
  WorkspaceManager.Default
);

export const RuntimeClient = ManagedRuntime.make(MainLayer);
