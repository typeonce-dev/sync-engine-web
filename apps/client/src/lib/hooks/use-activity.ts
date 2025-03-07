import { hookQuery, RuntimeLib, useDexieQuery } from "@local/client-lib";
import { Activity } from "@local/schema";
import { Effect } from "effect";

export const useActivity = ({ workspaceId }: { workspaceId: string }) => {
  return useDexieQuery(
    () =>
      RuntimeLib.runPromise(
        hookQuery({ workspaceId }).pipe(
          Effect.map((snapshot) => [...snapshot.activity])
        )
      ),
    Activity
  );
};
