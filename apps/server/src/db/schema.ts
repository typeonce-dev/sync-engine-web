import { customType, integer, pgTable, varchar } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array }>({
  dataType: () => "bytea",
});

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  snapshot: bytea(),
});
