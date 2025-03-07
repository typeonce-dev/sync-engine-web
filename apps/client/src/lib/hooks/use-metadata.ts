import { hookQuery, RuntimeLib, useDexieQuery } from "@local/client-lib";
import { Metadata } from "@local/schema";
import { Effect } from "effect";

export const useMetadata = ({ workspaceId }: { workspaceId: string }) => {
  return useDexieQuery(
    () =>
      RuntimeLib.runPromise(
        hookQuery({ workspaceId }).pipe(
          Effect.map((snapshot) => [snapshot.metadata])
        )
      ),
    Metadata
  );
};
