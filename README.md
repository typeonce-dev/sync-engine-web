# How to implement a backend with Effect
`@effect/platform` provides a type safe API for building backend apps. Any runtime, any database, and with all the features you expect from a TypeScript backend.

> [**Check out the full article**](https://www.typeonce.dev/article/how-to-implement-a-backend-with-effect) to learn how to get started 🚀


## Getting started
This repository includes the following:
- Shared `effect` API definition ([`packages/api`](./packages/api/))
- Backend implementation with `effect` ([`apps/server`](/apps/server/))
- Frontend implementation with [TanStack Router](https://tanstack.com/router/latest) ([`apps/client`](/apps/client/))
- Docker compose for local Postgres + [PgAdmin](https://www.pgadmin.org/) environment ([`docker-compose.yaml`](./docker-compose.yaml))

First, open [Docker Desktop](https://www.docker.com/products/docker-desktop/) and execute the below command to start the database and PgAdmin:

> Make sure to create a `.env` file inside *both* the root directory *and* `apps/server`, containing the parameters listed inside `.env.example`.

```sh
docker compose up
```

This will start the database and PgAdmin. You can access `http://localhost:5050/` to login into the **local PgAdmin dashboard**.

> Use the credentials from `.env`: `PGADMIN_MAIL`+`PGADMIN_PW`.

You can then execute both server and client in the monorepo. Open a second terminal and run the below commands:

```sh
pnpm install
pnpm run dev
```

This will start `client` on `http://localhost:3001/`, and `server` on `http://localhost:3000/`.

Done ✨

Server, client, and database all now all connected. Explore more of the `effect` API by playing around with the code in the repository 🕹️

> [**Check out the full article**](https://www.typeonce.dev/article/how-to-implement-a-backend-with-effect) for the details of how the code works 🚀
