import { Service, useDexieQuery } from "@local/client-lib";
import { SnapshotSchema } from "@local/schema";
import { RuntimeClient } from "../runtime-client";

export const useFood = ({ workspaceId }: { workspaceId: string }) => {
  return useDexieQuery(
    () =>
      RuntimeClient.runPromise(
        Service.LoroStorage.use(({ query }) =>
          query((doc) => doc.getList("food"), {
            workspaceId,
          })
        )
      ),
    SnapshotSchema.fields.food.value
  );
};
