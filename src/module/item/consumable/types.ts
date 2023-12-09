import { AMMO_STACK_GROUPS } from "./values.ts";

type ConsumableTrait = keyof typeof CONFIG.PF2E.consumableTraits;
type OtherConsumableTag = "herbal";

type AmmoStackGroup = SetElement<typeof AMMO_STACK_GROUPS>;

export type { AmmoStackGroup, ConsumableTrait, OtherConsumableTag };
