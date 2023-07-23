import { ActorPF2e } from "@actor";
import { InitiativeData } from "@actor/data/base.ts";
import { strikeFromMeleeItem } from "@actor/helpers.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ConditionPF2e } from "@item";
import { ItemType } from "@item/data/index.ts";
import { Rarity } from "@module/data.ts";
import { extractModifiers } from "@module/rules/helpers.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { DamageType } from "@system/damage/index.ts";
import { ArmorStatistic } from "@system/statistic/armor-class.ts";
import { Statistic } from "@system/statistic/index.ts";
import { isObject, objectHasKey } from "@util";
import { HazardSource, HazardSystemData } from "./data.ts";
import { ImmunityData } from "@actor/data/iwr.ts";

class HazardPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    declare skills: { stealth: Statistic };

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "action", "melee"];
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    get isComplex(): boolean {
        return this.system.details.isComplex;
    }

    override get hardness(): number {
        return Math.abs(this.system.attributes.hardness);
    }

    get hasDefenses(): boolean {
        return !!(this.hitPoints?.max || this.attributes.ac.value);
    }

    /** Minimal check since the disabled status of a hazard isn't logged */
    override get canAttack(): boolean {
        return this.itemTypes.melee.length > 0;
    }

    override get emitsSound(): boolean {
        const { emitsSound } = this.system.attributes;
        return !this.isDead && typeof emitsSound === "boolean"
            ? emitsSound
            : !!game.combats.active?.started && game.combats.active.combatants.some((c) => c.actor === this);
    }

    /** Hazards without hit points are unaffected by damage */
    override isAffectedBy(effect: DamageType | ConditionPF2e): boolean {
        const damageType = objectHasKey(CONFIG.PF2E.damageTypes, effect)
            ? effect
            : isObject(effect)
            ? effect.system.persistent?.damageType ?? null
            : null;

        if (!this.system.attributes.hasHealth && damageType) {
            return false;
        }

        return super.isAffectedBy(effect);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const { attributes, details } = this.system;
        attributes.hp.negativeHealing = false;
        attributes.hp.brokenThreshold = Math.floor(attributes.hp.max / 2);
        attributes.hasHealth = attributes.hp.max > 0;
        // Hazards have object immunities (CRB p. 273): can be overridden by Immunity rule element
        if (!attributes.immunities.some((i) => i.type === "object-immunities")) {
            attributes.immunities.unshift(
                new ImmunityData({ type: "object-immunities", source: "TYPES.Actor.hazard" })
            );
        }

        if (this.isComplex) {
            // Ensure stealth value is numeric and set baseline initiative data
            attributes.stealth.value ??= 0;
            const partialAttributes: { initiative?: Pick<InitiativeData, "statistic" | "tiebreakPriority"> } =
                this.system.attributes;
            partialAttributes.initiative = {
                statistic: "stealth",
                tiebreakPriority: this.hasPlayerOwner ? 2 : 1,
            };
        }

        details.alliance = null;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const { system } = this;

        this.prepareSynthetics();

        // Stealth, which is the only skill hazards have
        this.skills = {
            stealth: new Statistic(this, {
                slug: "stealth",
                label: CONFIG.PF2E.skillList.stealth,
                domains: ["stealth", `dex-based`, "skill-check", `dex-skill-check`, "all"],
                modifiers: [
                    new ModifierPF2e({
                        label: "PF2E.ModifierTitle",
                        slug: "base",
                        type: "untyped",
                        modifier: system.attributes.stealth.value ?? 0,
                    }),
                ],
                check: { type: "skill-check" },
            }),
        };

        // Initiative
        if (system.attributes.initiative) {
            this.initiative = new ActorInitiative(this);
            system.attributes.initiative = this.initiative.getTraceData();
        }

        // Armor Class
        if (this.hasDefenses) {
            const baseModifier = new ModifierPF2e({
                slug: "base",
                label: "PF2E.BaseModifier",
                modifier: system.attributes.ac.value - 10,
            });
            const statistic = new ArmorStatistic(this, { rank: 1, modifiers: [baseModifier] });
            this.armorClass = statistic.dc;
            system.attributes.ac = statistic.getTraceData();
        }

        this.saves = this.prepareSaves();
        this.system.actions = this.itemTypes.melee.map((m) => strikeFromMeleeItem(m));
    }

    protected prepareSaves(): { [K in SaveType]?: Statistic } {
        const { system } = this;

        // Saving Throws
        return SAVE_TYPES.reduce((saves: { [K in SaveType]?: Statistic }, saveType) => {
            const save = system.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const base = save.value;
            const ability = CONFIG.PF2E.savingThrowDefaultAbilities[saveType];

            // Saving Throws with a value of 0 are not usable by the hazard
            // Later on we'll need to explicitly check for null, since 0 is supposed to be valid
            if (!base) return saves;

            const selectors = [saveType, `${ability}-based`, "saving-throw", "all"];
            const stat = new Statistic(this, {
                slug: saveType,
                label: saveName,
                domains: selectors,
                modifiers: [
                    new ModifierPF2e("PF2E.BaseModifier", base, "untyped"),
                    ...extractModifiers(this.synthetics, selectors),
                ],
                check: {
                    type: "saving-throw",
                },
            });

            mergeObject(this.system.saves[saveType], stat.getTraceData());

            saves[saveType] = stat;
            return saves;
        }, {});
    }
}

interface HazardPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: HazardSource;
    readonly abilities?: never;
    system: HazardSystemData;

    saves: { [K in SaveType]?: Statistic };
}

export { HazardPF2e };
