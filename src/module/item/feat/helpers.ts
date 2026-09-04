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

/** Mutates the data to prevent certain combinations of traits and categories. */
function adjustFeatTraitsAndCategory(featSystemData: FeatPF2e["system"] | FeatPF2e["_source"]["system"]): void {
    const traits = featSystemData.traits.value;

    // Add the General trait if of the general feat type
    if (featSystemData.category === "general" && !traits.includes("general")) {
        traits.push("general");
    }

    if (featSystemData.category === "skill") {
        // Add the Skill trait
        if (!traits.includes("skill")) traits.push("skill");

        // Add the General trait only if the feat is not an archetype skill feat
        if (!traits.includes("general") && !traits.includes("archetype")) {
            traits.push("general");
        }
    }

    // Only archetype feats can have the dedication trait
    if (traits.includes("dedication")) {
        featSystemData.category = "class";
        if (!traits.includes("archetype")) traits.push("archetype");
    }
}

export { adjustFeatTraitsAndCategory, featCanHaveKeyOptions, suppressFeats };
