import * as R from "remeda";
import { BehaviorType, KingmakerCategory } from "./types.ts";

interface CategoryData {
    behavior: BehaviorType;
    levelLabel?: string;
}

const KINGDOM_CATEGORY_DATA = {
    "army-tactic": { behavior: "feat", levelLabel: "PF2E.Kingmaker.Feature.Tactic" },
    "army-war-action": { behavior: "activity" },
    "kingdom-feat": { behavior: "feat" },
    "kingdom-feature": { behavior: "feature" },
    "kingdom-activity": { behavior: "activity" },
} satisfies Record<string, CategoryData>;

const KINGMAKER_CATEGORY_TYPES = Object.keys(KINGDOM_CATEGORY_DATA) as (keyof typeof KINGDOM_CATEGORY_DATA)[];

const KINGMAKER_CATEGORIES: Record<KingmakerCategory, string> = R.mapToObj(KINGMAKER_CATEGORY_TYPES, (type) => [
    type,
    `PF2E.Kingmaker.Feature.Categories.${type}`,
]);

export { KINGDOM_CATEGORY_DATA, KINGMAKER_CATEGORIES, KINGMAKER_CATEGORY_TYPES };
export type { CategoryData };
