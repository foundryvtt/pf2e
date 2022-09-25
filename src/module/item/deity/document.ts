import { Alignment } from "@actor/creature/types";
import { ALIGNMENTS } from "@actor/creature/values";
import { ItemPF2e } from "@item";
import { BaseWeaponType } from "@item/weapon/types";
import { sluggify } from "@util";
import { DeityData } from "./data";

class DeityPF2e extends ItemPF2e {
    get category(): "deity" | "pantheon" | "philosophy" {
        return this.system.category;
    }

    get alignment(): Alignment | null {
        return this.system.alignment.own;
    }

    get favoredWeapons(): BaseWeaponType[] {
        return [...this.system.weapons];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        if (this.category === "philosophy") {
            const systemData = this.system;
            systemData.domains = { primary: [], alternate: [] };
            systemData.font = [];
            systemData.spells = {};
            systemData.weapons = [];
        }
    }

    override prepareActorData(this: Embedded<DeityPF2e>): void {
        if (!this.actor.isOfType("character")) {
            // This should never happen, but ...
            this.delete({ render: false });
            return;
        }

        this.actor.deity = this;

        const { deities } = this.actor.system.details;
        const systemData = this.system;
        deities.primary = {
            alignment: deepClone(systemData.alignment),
            skill: deepClone(systemData.skill),
            weapons: deepClone(systemData.weapons),
        };

        // Set available domains from this deity
        for (const domain of this.system.domains.primary) {
            const label = CONFIG.PF2E.deityDomains[domain]?.label;
            deities.domains[domain] = label ?? domain;
        }

        // Set some character roll options
        const slug = this.slug ?? sluggify(this.name);
        const prefix = "deity:primary";
        const actorRollOptions = this.actor.rollOptions;
        actorRollOptions.all["deity"] = true;
        actorRollOptions.all[`${prefix}:${slug}`] = true;

        for (const baseType of this.favoredWeapons) {
            actorRollOptions.all[`${prefix}:favored-weapon:${baseType}`] = true;
        }

        if (this.alignment) {
            actorRollOptions.all[`${prefix}:alignment:${this.alignment.toLowerCase()}`] = true;
        }

        const followerAlignments = (
            this.system.alignment.follower.length > 0 ? this.system.alignment.follower : Array.from(ALIGNMENTS)
        ).map((a) => a.toLowerCase());
        for (const alignment of followerAlignments) {
            actorRollOptions.all[`${prefix}:alignment:follower:${alignment}`] = true;
        }

        // Used for targeting by creatures with mechanically-significant dislikes for the followers of specific deities
        actorRollOptions.all[`self:deity:${slug}`] = true;
    }

    /** If applicable, set a trained proficiency with this deity's favored weapon */
    setFavoredWeaponRank(this: Embedded<DeityPF2e>): void {
        if (!this.actor.isOfType("character")) return;

        const favoredWeaponRank = this.actor.flags.pf2e.favoredWeaponRank;
        if (favoredWeaponRank > 0) {
            const proficiencies = this.actor.system.martial;
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

    override getRollOptions(prefix = this.type): string[] {
        const baseOptions = super.getRollOptions(prefix);
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        return [...baseOptions, `${delimitedPrefix}category:${this.category}`].sort();
    }
}

interface DeityPF2e extends ItemPF2e {
    readonly data: DeityData;
}

export { DeityPF2e };
