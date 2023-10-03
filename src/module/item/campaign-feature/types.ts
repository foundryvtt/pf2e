import { KINGMAKER_CATEGORY_TYPES } from "./values.ts";

type BehaviorType = "feat" | "feature" | "activity";
type KingmakerCategory = (typeof KINGMAKER_CATEGORY_TYPES)[number];
type KingmakerTrait = keyof ConfigPF2e["PF2E"]["kingmakerTraits"];

export type { BehaviorType, KingmakerCategory, KingmakerTrait };
