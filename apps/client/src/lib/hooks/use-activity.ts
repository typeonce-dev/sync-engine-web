import { Activity } from "@local/sync/loro";
import { RuntimeClient } from "../runtime-client";
import { useDexieQuery } from "../use-dexie-query";
import { hookQuery } from "./hook-query";

export const useActivity = ({ workspaceId }: { workspaceId: string }) => {
  return useDexieQuery(
    () => RuntimeClient.runPromise(hookQuery({ workspaceId })),
    Activity
  );
};
