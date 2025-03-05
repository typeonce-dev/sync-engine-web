import { Activity } from "@local/schema";
import { Effect } from "effect";
import { RuntimeClient } from "../runtime-client";
import { useDexieQuery } from "../use-dexie-query";
import { hookQuery } from "./hook-query";

export const useActivity = ({ workspaceId }: { workspaceId: string }) => {
  return useDexieQuery(
    () =>
      RuntimeClient.runPromise(
        hookQuery({ workspaceId }).pipe(
          Effect.map((snapshot) => [...snapshot.activity])
        )
      ),
    Activity
  );
};
