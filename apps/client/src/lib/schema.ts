import { Schema } from "effect";

export class UserTable extends Schema.Class<UserTable>("UserTable")({
  userId: Schema.UUID,
  name: Schema.String,
}) {}
