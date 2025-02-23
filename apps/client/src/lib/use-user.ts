import { UserTable } from "./schema";
import { useDexieQuery } from "./use-dexie-query";

export const useUser = () => {
  return useDexieQuery((_) => _.user.toArray(), UserTable);
};
