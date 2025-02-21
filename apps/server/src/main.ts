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
import { ServerApi } from "@local/api";
import { Effect, Layer } from "effect";
import { createServer } from "node:http";
import { MigratorLive } from "./migrator";
import { UserGroupLive } from "./user";

const EnvProviderLayer = Layer.unwrapEffect(
  PlatformConfigProvider.fromDotEnv(".env").pipe(
    Effect.map(Layer.setConfigProvider),
    Effect.provide(NodeFileSystem.layer)
  )
);

const MainApiLive = HttpApiBuilder.api(ServerApi).pipe(
  Layer.provide([MigratorLive, UserGroupLive]),
  Layer.provide(EnvProviderLayer)
);

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MainApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
);

NodeRuntime.runMain(Layer.launch(HttpLive));
