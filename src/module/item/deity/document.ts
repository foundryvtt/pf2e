import { ALIGNMENTS } from "@actor/creature/values";
import { ItemPF2e } from "@item";
import { BaseWeaponType } from "@item/weapon/types";
import { sluggify } from "@util";
import { DeityData } from "./data";
import { DeitySheetPF2e } from "./sheet";

class DeityPF2e extends ItemPF2e {
    get favoredWeapons(): BaseWeaponType[] {
        return [...this.data.data.weapons];
    }

    override prepareActorData(this: Embedded<DeityPF2e>): void {
        if (!this.actor.isOfType("character")) {
            // This should never happen, but ...
            this.delete({ render: false });
            return;
        }

        this.actor.deity = this;

        const { deities } = this.actor.data.data.details;
        const systemData = this.data.data;
        deities.primary = {
            alignment: deepClone(systemData.alignment),
            skill: deepClone(systemData.skill),
            weapons: systemData.weapons.flatMap((w) =>
                w in CONFIG.PF2E.baseWeaponTypes ? { option: w, label: CONFIG.PF2E.baseWeaponTypes[w] } : []
            ),
        };

        // Set available domains from this deity
        for (const domain of this.data.data.domains.primary) {
            const label = CONFIG.PF2E.deityDomains[domain]?.label;
            deities.domains[domain] = label ?? domain;
        }

        // Set some character roll options
        const slug = this.slug ?? sluggify(this.name);
        const prefix = "deity:primary";
        const actorRollOptions = this.actor.rollOptions;
        actorRollOptions.all[`${prefix}:${slug}`] = true;

        for (const baseType of this.favoredWeapons) {
            actorRollOptions.all[`${prefix}:favored-weapon:${baseType}`] = true;
        }

        const alignments = (
            this.data.data.alignment.follower.length > 0 ? this.data.data.alignment.follower : Array.from(ALIGNMENTS)
        ).map((a) => a.toLowerCase());
        for (const alignment of alignments) {
            actorRollOptions.all[`${prefix}:alignment:follower:${alignment}`] = true;
        }

        // Used for targeting by creatures with mechanically-significant dislikes for the followers of specific deities
        actorRollOptions.all[`self:deity:${slug}`] = true;
    }

    /** If applicable, set a trained proficiency with this deity's favored weapon */
    setFavoredWeaponRank(this: Embedded<DeityPF2e>): void {
        if (!this.actor.isOfType("character")) return;

        const favoredWeaponRank = this.actor.data.flags.pf2e.favoredWeaponRank;
        if (favoredWeaponRank > 0) {
            const proficiencies = this.actor.data.data.martial;
            for (const baseType of this.favoredWeapons) {
                mergeObject(proficiencies, {
                    [`weapon-base-${baseType}`]: {
                        label: CONFIG.PF2E.baseWeaponTypes[baseType],
                        rank: Math.max(Number(proficiencies[`weapon-base-${baseType}`]?.rank) || 0, favoredWeaponRank),
                    },
                });
            }
        }
    }
}

interface DeityPF2e extends ItemPF2e {
    readonly data: DeityData;

    readonly _sheet: DeitySheetPF2e<this>;
}

export { DeityPF2e };
