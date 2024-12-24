import type { CreatureTrait } from "@actor/creature/types.ts";
import type { AbilityTrait } from "@item/ability/types.ts";
import type { KingmakerTrait } from "@item/campaign-feature/types.ts";
import type { NPCAttackTrait } from "@item/melee/types.ts";
import type { PhysicalItemTrait } from "@item/physical/types.ts";

type ItemTrait = AbilityTrait | CreatureTrait | PhysicalItemTrait | NPCAttackTrait | KingmakerTrait;

export type { ItemTrait };
