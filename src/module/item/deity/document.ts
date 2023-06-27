import { ActorPF2e, CharacterPF2e } from "@actor";
import { Alignment } from "@actor/creature/types.ts";
import { ALIGNMENTS } from "@actor/creature/values.ts";
import { ItemPF2e } from "@item";
import { BaseWeaponType } from "@item/weapon/types.ts";
import { objectHasKey, sluggify } from "@util";
import { DeitySource, DeitySystemData } from "./data.ts";

class DeityPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
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

    override prepareActorData(this: DeityPF2e<ActorPF2e>): void {
        if (!this.actor.isOfType("character")) {
            // This should never happen, but ...
            this.delete({ render: false });
            return;
        }

        this.actor.deity = this as DeityPF2e<CharacterPF2e>;

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
            // Add the apocryphal variant if there is one
            const apocryphaKey = `${domain}-apocryphal`;
            if (objectHasKey(CONFIG.PF2E.deityDomains, apocryphaKey)) {
                const apocrypha = CONFIG.PF2E.deityDomains[apocryphaKey];
                deities.domains[apocryphaKey] = apocrypha.label;
            }
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
    setFavoredWeaponRank(this: DeityPF2e<ActorPF2e>): void {
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
        return [...baseOptions, `${prefix}:category:${this.category}`].sort();
    }
}

interface DeityPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: DeitySource;
    system: DeitySystemData;
}

export { DeityPF2e };
