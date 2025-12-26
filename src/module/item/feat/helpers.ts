import type { ActorPF2e } from "@actor";
import type { AbilityItemPF2e } from "@item";
import type { FeatPF2e } from "./document.ts";

/**
 * Whether a feat item can have key ability options
 * The item must be a level-1 class feature that is either not (RE-)granted or is granted by another class feature. It
 * must also only have at most a single trait (assumed to be that of the class)
 */
function featCanHaveKeyOptions(feat: FeatPF2e): boolean {
    if (feat.category !== "classfeature" || feat.level !== 1 || feat.traits.size > 1) {
        return false;
    }

    const { grantedBy } = feat;
    return !grantedBy || (grantedBy.isOfType("feat") && grantedBy.category === "classfeature");
}

/** Recursively suppresses a feat and its granted feats */
function suppressFeats(feats: (FeatPF2e | AbilityItemPF2e)[]): void {
    for (const featOrAbility of feats) {
        featOrAbility.suppressed = true;
        const allGrants = Object.values(featOrAbility.flags[SYSTEM_ID].itemGrants)
            .map((g) => featOrAbility.actor?.items.get(g.id))
            .filter((i): i is FeatPF2e<ActorPF2e> | AbilityItemPF2e<ActorPF2e> => !!i?.isOfType("action", "feat"));
        suppressFeats(allGrants);
    }
}

export { featCanHaveKeyOptions, suppressFeats };
