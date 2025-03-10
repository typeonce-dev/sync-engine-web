import { RuntimeLayer } from "@local/client-lib";
import { Layer, ManagedRuntime } from "effect";
import { Storage } from "./storage";

const MainLayer = Layer.mergeAll(RuntimeLayer, Storage.Default);

export const RuntimeClient = ManagedRuntime.make(MainLayer);
