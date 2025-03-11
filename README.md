# Sync Engine Web

A local-first, offline-capable web sync engine implementation with CRDT-based synchronization. The project provides a complete solution for data synchronization between multiple devices while maintaining data consistency and offline capabilities.

## Architecture

The project is structured as a monorepo with three main components:

1. **Client**
   - Web-based UI implementation
   - Local-first storage using IndexedDB ([`dexie`](https://dexie.org/))
   - Background sync using Web Workers
   - Client-side schema migrations
   - Offline-first data management

2. **Server**
   - REST API for data synchronization
   - JWT-based authentication and authorization
   - Byte-level data storage (client-agnostic)
   - Workspace management and backup
   - Token-based access control

3. **Shared Packages**
   - Schema definitions
   - Type definitions
   - Shared utilities
   - Migration utilities

## Key Features

- **Local-First Architecture**: Data is primarily stored and managed locally, with server acting as sync + backup
- **CRDT-Based Sync**: Uses [`loro-crdt`](https://loro.dev/) for conflict-free data synchronization
- **Offline Support**: Full offline capability with background sync
- **Multi-Device Access**: Share workspaces across devices using access tokens
- **Type-Safe Migrations**: Version-controlled schema migrations
- **Secure Authentication**: JWT-based auth with master/access token system

## Implementation Details

- Client stores and syncs data using CRDT (Conflict-free Replicated Data Type)
- Server is client-agnostic, storing only byte-level data
- Master client controls workspace access through token generation
- Schema migrations are performed client-side
- Background syncing handled by Web Workers
- No server-side querying - all data operations happen client-side

## Authentication Flow

1. Client creates local workspace
2. Server stores workspace and designates client as "master"
3. Master client receives master token
4. Master client generates access tokens for other devices
5. Access tokens can be shared via links
6. Server handles token verification and authorization

## Data Flow

```
Client (Local Storage) <-> Web Worker (Background Sync) <-> Server (Byte Storage)
```

- UI reads directly from local storage
- Sync operations happen in background
- Server stores encoded CRDT data as bytes
- Migrations happen during client initialization

## Technologies

- CRDT: `loro-crdt` for data synchronization
- Storage: IndexedDB (client), Database (server)
- Authentication: JWT tokens
- Background Processing: Web Workers

## Dependencies

### Client
- **UI & Routing**
  - `react` - UI framework
  - `@tanstack/react-router` - Type-safe routing
- **Storage & Sync**
  - `loro-crdt` - CRDT implementation
  - `dexie` - IndexedDB wrapper
  - `dexie-react-hooks` - React hooks for Dexie
- **Core**
  - `effect` - Functional programming toolkit
  - `@effect/platform-browser` - Browser-specific Effect utilities

### Server
- **Database**
  - `drizzle-orm` - TypeScript ORM
  - `@effect/sql` - SQL integration for Effect
  - `@effect/sql-pg` - PostgreSQL driver
  - `pg` - PostgreSQL client
- **Authentication**
  - `jsonwebtoken` - JWT implementation
- **Core**
  - `effect` - Functional programming toolkit
  - `@effect/platform-node` - Node.js-specific Effect utilities

### Build Tools
- `turbo` - Monorepo build system
- `vite` - Frontend build tool
- `typescript` - Type system

## Project Status

This is a functional implementation of a web sync engine, optimized for single-user scenarios (not real-time collaboration). The focus is on providing reliable data synchronization while maintaining offline capabilities.
