import * as R from "remeda";
import { BehaviorType, KingmakerCategory } from "./types.ts";

const KINGDOM_CATEGORY_DATA = {
    "kingdom-feat": { behavior: "feat" },
    "kingdom-feature": { behavior: "feature" },
    "kingdom-activity": { behavior: "activity" },
} satisfies Record<string, { behavior: BehaviorType }>;

const KINGMAKER_CATEGORY_TYPES = Object.keys(KINGDOM_CATEGORY_DATA) as (keyof typeof KINGDOM_CATEGORY_DATA)[];

const KINGMAKER_CATEGORIES: Record<KingmakerCategory, string> = R.mapToObj(KINGMAKER_CATEGORY_TYPES, (type) => [
    type,
    `PF2E.Kingmaker.Feature.Categories.${type}`,
]);

export { KINGMAKER_CATEGORIES, KINGMAKER_CATEGORY_TYPES, KINGDOM_CATEGORY_DATA };
