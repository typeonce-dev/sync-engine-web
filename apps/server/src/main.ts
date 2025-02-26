import {
  HttpApiBuilder,
  HttpMiddleware,
  HttpServer,
  PlatformConfigProvider,
} from "@effect/platform";
import {
  NodeFileSystem,
  NodeHttpServer,
  NodeRuntime,
} from "@effect/platform-node";
import { SyncApi } from "@local/sync";
import { Effect, Layer } from "effect";
import { createServer } from "node:http";
import { Drizzle } from "./drizzle";
import { SyncAuthGroupLive } from "./group/sync-auth";
import { SyncDataGroupLive } from "./group/sync-data";

const EnvProviderLayer = Layer.unwrapEffect(
  PlatformConfigProvider.fromDotEnv(".env").pipe(
    Effect.map(Layer.setConfigProvider),
    Effect.provide(NodeFileSystem.layer)
  )
);

const MainApiLive = HttpApiBuilder.api(SyncApi).pipe(
  Layer.provide([Drizzle.Default, SyncDataGroupLive, SyncAuthGroupLive]),
  Layer.provide(EnvProviderLayer)
);

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MainApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
);

NodeRuntime.runMain(Layer.launch(HttpLive));
