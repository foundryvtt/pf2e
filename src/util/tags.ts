import { TraitViewData } from "@actor/data/base";
import { objectHasKey } from "./misc";

function traitSlugToObject(trait: string, dictionary: Record<string, string | undefined>): TraitViewData {
    // Look up trait labels from `npcAttackTraits` instead of `weaponTraits` in case a battle form attack is
    // in use, which can include what are normally NPC-only traits
    const label = dictionary[trait] ?? trait;
    const traitObject: TraitViewData = {
        name: trait,
        label,
    };
    if (objectHasKey(CONFIG.PF2E.traitsDescriptions, trait)) {
        traitObject.description = CONFIG.PF2E.traitsDescriptions[trait];
    }

    return traitObject;
}

export { traitSlugToObject };
