import { ImmunityData } from "@actor/data/iwr";
import { CreaturePF2e } from "./document";
import { ImmunityType } from "@actor/types";

/** Set immunities for creatures with traits call for them */
function setImmunitiesFromTraits(actor: CreaturePF2e): void {
    if (actor.isOfType("character")) return;

    const { traits } = actor;
    const { immunities } = actor.attributes;

    if (traits.has("construct") && !traits.has("eidolon")) {
        // "Constructs are often mindless; they are immune to bleed damage, death effects, disease, healing, necromancy,
        // nonlethal attacks, poison, and the doomed, drained, fatigued, paralyzed, sickened, and unconscious
        // conditions; and they may have Hardness based on the materials used to construct their bodies."
        // – Bestiary 2 pg. 346
        const constructImmunities: ImmunityType[] = [
            "bleed",
            "death-effects",
            "disease",
            "doomed",
            "drained",
            "fatigued",
            "healing",
            "necromancy",
            "nonlethal-attacks",
            "paralyzed",
            "poison",
            "sickened",
            "unconscious",
        ];
        for (const immunityType of constructImmunities) {
            if (!immunities.some((i) => i.type === immunityType)) {
                immunities.push(
                    new ImmunityData({ type: immunityType, source: game.i18n.localize("PF2E.TraitConstruct") })
                );
            }
        }
    }

    // "They are immune to all mental effects." – CRB pg. 634
    if (traits.has("mindless") && !immunities.some((i) => i.type === "mental")) {
        immunities.push(new ImmunityData({ type: "mental", source: game.i18n.localize("PF2E.TraitMindless") }));
    }
}

export { setImmunitiesFromTraits };
