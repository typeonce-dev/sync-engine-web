import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "@effect/platform";
import { Schema } from "effect";

export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  snapshot: Schema.NullOr(
    Schema.Uint8Array
    // .pipe(
    //   Schema.transform(Schema.instanceOf(Buffer), {
    //     decode: (uint8Array) => Buffer.from(uint8Array),
    //     encode: (buffer) => new Uint8Array(buffer),
    //   })
    // )
  ),
}) {}

class UserGroup extends HttpApiGroup.make("user")
  .add(
    HttpApiEndpoint.post("createUser")`/user/create`
      .setPayload(User.pipe(Schema.pick("name", "snapshot")))
      .addError(Schema.String)
      .addSuccess(Schema.Array(User))
  )
  .add(
    HttpApiEndpoint.get(
      "getUser"
    )`/user/get/${HttpApiSchema.param("id", Schema.NumberFromString)}`
      .addError(Schema.String)
      .addSuccess(User)
  ) {}

export class ServerApi extends HttpApi.make("server-api").add(UserGroup) {}
