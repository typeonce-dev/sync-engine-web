import { Service, useDexieQuery } from "@local/client-lib";
import { SnapshotSchema } from "@local/schema";
import { Effect } from "effect";
import { RuntimeClient } from "../runtime-client";

export const useMeal = ({ workspaceId }: { workspaceId: string }) => {
  return useDexieQuery(() =>
    RuntimeClient.runPromise(
      Effect.gen(function* () {
        const { query } = yield* Service.LoroStorage;

        const meals = yield* query(
          (doc) => doc.getList("meal"),
          SnapshotSchema.fields.meal.value,
          { workspaceId }
        );

        const foods = yield* query(
          (doc) => doc.getList("food"),
          SnapshotSchema.fields.food.value,
          { workspaceId }
        );

        return meals.map(({ foodId, id, quantity }) => {
          const food = foods.find((food) => food.id === foodId);
          return { id, quantity, food };
        });
      })
    )
  );
};
