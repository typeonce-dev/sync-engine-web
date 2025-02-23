import { Layer, ManagedRuntime } from "effect";
import { ApiClient } from "./api-client";
import { Dexie } from "./dexie";

const MainLayer = Layer.mergeAll(Dexie.Default, ApiClient.Default);

export const RuntimeClient = ManagedRuntime.make(MainLayer);
