import {
  boolean,
  customType,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const scope = pgEnum("scope", ["read", "read_write"]);

export const bytea = customType<{ data: Uint8Array }>({
  dataType: () => "bytea",
});

export const workspaceTable = pgTable("workspace", {
  workspaceId: uuid().notNull(),
  ownerClientId: uuid().notNull(),
  clientId: uuid().notNull(),
  snapshotId: uuid().notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
  snapshot: bytea().notNull(),
});

export const clientTable = pgTable("client", {
  clientId: uuid().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const tokenTable = pgTable("token", {
  tokenId: integer().primaryKey().generatedAlwaysAsIdentity(),
  tokenValue: varchar().notNull(),
  clientId: uuid().notNull(),
  workspaceId: uuid().notNull(),
  isMaster: boolean().notNull().default(false),
  scope: scope().notNull(),
  issuedAt: timestamp().notNull().defaultNow(),
  expiresAt: timestamp(),
  revokedAt: timestamp(),
});
