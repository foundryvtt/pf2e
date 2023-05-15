import { InitiativeData } from "@actor/data/base.ts";
import { strikeFromMeleeItem } from "@actor/helpers.ts";
import { ActorPF2e } from "@actor";
import { ActorInitiative, InitiativeRollResult } from "@actor/initiative.ts";
import { MODIFIER_TYPE, ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemType } from "@item/data/index.ts";
import { ConditionPF2e } from "@item";
import { Rarity } from "@module/data.ts";
import { extractModifiers } from "@module/rules/helpers.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { DamageType } from "@system/damage/index.ts";
import { Statistic } from "@system/statistic/index.ts";
import { isObject, objectHasKey } from "@util";
import { HazardSource, HazardSystemData } from "./data.ts";
import { RollParameters } from "@system/rolls.ts";

class HazardPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
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
        this.prepareInitiative();

        // Armor Class
        {
            const base = system.attributes.ac.value;
            const domains = ["ac", "dex-based", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.BaseModifier", base, MODIFIER_TYPE.UNTYPED),
                ...extractModifiers(this.synthetics, domains, { test: this.getRollOptions(domains) }),
            ];

            const stat = mergeObject(new StatisticModifier("ac", modifiers), system.attributes.ac, {
                overwrite: false,
            });
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");

            system.attributes.ac = mergeObject(stat, { base });
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
                    new ModifierPF2e("PF2E.BaseModifier", base, MODIFIER_TYPE.UNTYPED),
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

    private prepareInitiative(): void {
        const { attributes } = this;
        if (!attributes.initiative) return;

        const skillName = game.i18n.localize(CONFIG.PF2E.skillList.stealth);
        const label = game.i18n.format("PF2E.InitiativeWithSkill", { skillName });
        const baseMod = attributes.stealth.value || 0;
        const statistic = new Statistic(this, {
            slug: "initiative",
            label,
            domains: ["initiative"],
            check: {
                type: "initiative",
                modifiers: [new ModifierPF2e("PF2E.ModifierTitle", baseMod, MODIFIER_TYPE.UNTYPED)],
            },
        });

        this.initiative = new ActorInitiative(this, statistic);
        attributes.initiative = mergeObject(attributes.initiative, statistic.getTraceData());
        attributes.initiative.roll = async (args: RollParameters): Promise<InitiativeRollResult | null> => {
            console.warn(
                `Rolling initiative via actor.attributes.initiative.roll() is deprecated: use actor.initiative.roll() instead.`
            );

            const result = await this.initiative?.roll({
                extraRollOptions: args.options ? [...args.options] : [],
                ...args,
            });

            return result ?? null;
        };
    }
}

interface HazardPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: HazardSource;
    readonly abilities?: never;
    system: HazardSystemData;

    saves: { [K in SaveType]?: Statistic };
}

export { HazardPF2e };
