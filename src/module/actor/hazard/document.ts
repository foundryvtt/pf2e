import { ActorPF2e } from "@actor";
import { strikeFromMeleeItem } from "@actor/helpers";
import { ActorInitiative } from "@actor/initiative";
import { MODIFIER_TYPE, ModifierPF2e, StatisticModifier } from "@actor/modifiers";
import { SaveType } from "@actor/types";
import { SAVE_TYPES } from "@actor/values";
import { ConditionPF2e } from "@item";
import { ItemType } from "@item/data";
import { Rarity } from "@module/data";
import { extractModifiers } from "@module/rules/helpers";
import { TokenDocumentPF2e } from "@scene";
import { DamageType } from "@system/damage";
import { Statistic } from "@system/statistic";
import { isObject, objectHasKey } from "@util";
import { HazardSource, HazardSystemData } from "./data";

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

    protected prepareInitiative(): void {
        if (!this.isComplex) return;

        const skillName = game.i18n.localize(CONFIG.PF2E.skillList.stealth);
        const label = game.i18n.format("PF2E.InitiativeWithSkill", { skillName });
        const baseMod = this.system.attributes.stealth.value || 0;
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
        const tiebreakPriority: 1 | 2 = this.hasPlayerOwner ? 2 : 1;
        this.system.attributes.initiative = mergeObject({ tiebreakPriority }, statistic.getTraceData());
    }
}

interface HazardPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: HazardSource;
    readonly abilities?: never;
    system: HazardSystemData;

    saves: { [K in SaveType]?: Statistic };
}

export { HazardPF2e };
