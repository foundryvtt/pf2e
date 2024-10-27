import type { ActorPF2e, CharacterPF2e } from "@actor";
import { MartialProficiency } from "@actor/character/data.ts";
import { ItemPF2e } from "@item";
import { BaseWeaponType } from "@item/weapon/types.ts";
import { ZeroToFour } from "@module/data.ts";
import { objectHasKey, sluggify } from "@util";
import { DeitySource, DeitySystemData } from "./data.ts";

class DeityPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    get category(): "deity" | "pantheon" | "philosophy" {
        return this.system.category;
    }

    get favoredWeapons(): BaseWeaponType[] {
        return [...this.system.weapons];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // @fixme this should always be an array
        this.system.skill ??= [];

        if (!this.system.sanctification?.modal) {
            this.system.sanctification = null;
        }

        if (this.category === "philosophy") {
            this.system.attribute = [];
            this.system.domains = { primary: [], alternate: [] };
            this.system.font = [];
            this.system.sanctification = null;
            this.system.skill = [];
            this.system.spells = {};
            this.system.weapons = [];
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
            skill: fu.deepClone(systemData.skill),
            weapons: fu.deepClone(systemData.weapons),
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

        const sanctifications = this.getSanctificationRollOptions().map((o) => `${prefix}:${o}`);
        for (const option of sanctifications) {
            actorRollOptions.all[option] = true;
        }

        for (const baseType of this.favoredWeapons) {
            actorRollOptions.all[`${prefix}:favored-weapon:${baseType}`] = true;
        }

        for (const font of systemData.font) {
            actorRollOptions.all[`${prefix}:font:${font}`] = true;
        }

        // Used for targeting by creatures with mechanically-significant dislikes for the followers of specific deities
        actorRollOptions.all[`self:deity:slug:${slug}`] = true;
    }

    /** If applicable, set a trained proficiency with this deity's favored weapon */
    setFavoredWeaponRank(this: DeityPF2e<ActorPF2e>): void {
        if (!this.actor.isOfType("character")) return;

        const favoredWeaponRank = this.actor.flags.pf2e.favoredWeaponRank;
        if (favoredWeaponRank > 0) {
            type PartialAttackProficiencies = Record<string, Partial<MartialProficiency> | undefined>;
            const attacks: PartialAttackProficiencies = this.actor.system.proficiencies.attacks;
            const baseWeaponTypes: Record<string, string | undefined> = CONFIG.PF2E.baseWeaponTypes;
            const baseShieldTypes: Record<string, string | undefined> = CONFIG.PF2E.baseShieldTypes;
            for (const baseType of this.favoredWeapons) {
                attacks[`weapon-base-${baseType}`] = {
                    label: baseWeaponTypes[baseType] ?? baseShieldTypes[baseType] ?? baseType,
                    rank: Math.max(
                        Number(attacks[`weapon-base-${baseType}`]?.rank) || 0,
                        favoredWeaponRank,
                    ) as ZeroToFour,
                };
            }
        }
    }

    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        const sanctifications = this.getSanctificationRollOptions().map((o) => `${prefix}:${o}`);
        return [
            ...super.getRollOptions(prefix, options),
            `${prefix}:category:${this.category}`,
            ...sanctifications,
        ].sort();
    }

    private getSanctificationRollOptions(): string[] {
        const { sanctification } = this.system;
        const modal = sanctification?.modal;
        return sanctification?.modal && sanctification.what.length > 0
            ? sanctification.what.map((s) => `sanctification:${modal}:${s}`)
            : ["sanctification:none"];
    }
}

interface DeityPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: DeitySource;
    system: DeitySystemData;
}

export { DeityPF2e };
