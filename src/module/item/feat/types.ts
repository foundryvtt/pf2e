import { FEAT_CATEGORIES } from "./values.ts";

type FeatCategory = SetElement<typeof FEAT_CATEGORIES>;
type FeatTrait = keyof ConfigPF2e["PF2E"]["featTraits"];

export { FeatCategory, FeatTrait };
