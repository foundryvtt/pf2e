import type { FEAT_OR_FEATURE_CATEGORIES } from "./values.ts";

type FeatOrFeatureCategory = SetElement<typeof FEAT_OR_FEATURE_CATEGORIES>;
type FeatTrait = keyof ConfigPF2e["PF2E"]["featTraits"];

export type { FeatOrFeatureCategory, FeatTrait };
