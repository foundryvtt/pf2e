import type { CONSUMABLE_CATEGORIES } from "./values.ts";

/** All reloadable ammo is either a single use, a magazine, or fired weapons (darts/shurikens) */
type AmmoBehavior = "single" | "magazine" | "weapon";

type ConsumableCategory = SetElement<typeof CONSUMABLE_CATEGORIES>;
type ConsumableTrait = keyof typeof CONFIG.PF2E.consumableTraits;
type AmmoCategory = keyof typeof CONFIG.PF2E.ammoCategories;
type AmmoType = keyof typeof CONFIG.PF2E.ammoTypes;
type OtherConsumableTag = "alchemical-food" | "alchemical-tool" | "herbal";

export type { AmmoBehavior, AmmoCategory, AmmoType, ConsumableCategory, ConsumableTrait, OtherConsumableTag };
