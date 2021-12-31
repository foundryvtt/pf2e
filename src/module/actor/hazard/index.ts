import { HazardData } from "./data";
import { ActorPF2e } from "@actor/index";
import { Rarity } from "@module/data";
import { SaveType, SAVE_TYPES } from "@actor/data";
import { ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@module/modifiers";
import { RuleElementSynthetics } from "@module/rules/rules-data-definitions";
import { RuleElementPF2e } from "@module/rules/rules";
import { extractNotes, extractModifiers } from "@module/rules/util";
import { Statistic } from "@system/statistic";

export class HazardPF2e extends ActorPF2e {
    static override get schema(): typeof HazardData {
        return HazardData;
    }

    get rarity(): Rarity {
        return this.data.data.traits.rarity;
    }

    get isComplex(): boolean {
        return this.data.data.details.isComplex;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.data.data.attributes.initiative = { tiebreakPriority: this.hasPlayerOwner ? 2 : 1 };
        this.data.data.attributes.hp.negativeHealing = false;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const { data } = this.data;

        const rules = this.rules.filter((rule) => !rule.ignored);
        const synthetics = this.prepareCustomModifiers(rules);
        const { statisticsModifiers } = synthetics;

        // Armor Class
        {
            const base = data.attributes.ac.value;
            const rollOptions = ["ac", "dex-based", "all"];
            const modifiers = [
                new ModifierPF2e("PF2E.BaseModifier", base, MODIFIER_TYPE.UNTYPED),
                ...rollOptions
                    .flatMap((key) => statisticsModifiers[key] || [])
                    .map((m) => m.clone({ test: this.getRollOptions(rollOptions) })),
            ];

            const stat = mergeObject(new StatisticModifier("ac", modifiers), data.attributes.ac, {
                overwrite: false,
            });
            stat.base = base;
            stat.value = stat.totalModifier;
            stat.breakdown = stat.modifiers
                .filter((m) => m.enabled)
                .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`)
                .join(", ");

            data.attributes.ac = stat;
        }

        this.prepareSaves(synthetics);
    }

    /** Compute custom stat modifiers provided by users or given by conditions. */
    protected prepareCustomModifiers(rules: RuleElementPF2e[]): RuleElementSynthetics {
        // Collect all sources of modifiers for statistics and damage in these two maps, which map ability -> modifiers.
        const synthetics: RuleElementSynthetics = {
            damageDice: {},
            martialProficiencies: {},
            multipleAttackPenalties: {},
            rollNotes: {},
            senses: [],
            statisticsModifiers: {},
            strikes: [],
            striking: {},
            weaponPotency: {},
        };
        const statisticsModifiers = synthetics.statisticsModifiers;

        for (const rule of rules) {
            try {
                rule.onBeforePrepareData?.(synthetics);
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${rule}.`, error);
            }
        }

        // Get all of the active conditions (from the item array), and add their modifiers.
        const conditions = this.itemTypes.condition
            .filter((c) => c.data.flags.pf2e?.condition && c.data.data.active)
            .map((c) => c.data);

        for (const [key, value] of game.pf2e.ConditionManager.getModifiersFromConditions(conditions.values())) {
            statisticsModifiers[key] = (statisticsModifiers[key] || []).concat(value);
        }

        return synthetics;
    }

    protected prepareSaves(synthetics: RuleElementSynthetics) {
        const data = this.data.data;
        const { rollNotes, statisticsModifiers } = synthetics;

        // Saving Throws
        const saves: Partial<Record<SaveType, Statistic>> = {};
        for (const saveType of SAVE_TYPES) {
            const save = data.saves[saveType];
            const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
            const base = save.value;
            const ability = CONFIG.PF2E.savingThrowDefaultAbilities[saveType];

            // Saving Throws with a value of 0 are not usable by the hazard
            if (base === 0) continue;

            const selectors = [saveType, `${ability}-based`, "saving-throw", "all"];
            const stat = new Statistic(this, {
                slug: saveType,
                notes: extractNotes(rollNotes, selectors),
                domains: selectors,
                modifiers: [
                    new ModifierPF2e("PF2E.BaseModifier", base, MODIFIER_TYPE.UNTYPED),
                    ...extractModifiers(statisticsModifiers, selectors),
                ],
                check: {
                    type: "saving-throw",
                    label: game.i18n.format("PF2E.SavingThrowWithName", { saveName }),
                },
                dc: {},
            });

            saves[saveType] = stat;
            mergeObject(this.data.data.saves[saveType], stat.getCompatData());
        }

        this.saves = saves as Record<SaveType, Statistic>;
    }
}

export interface HazardPF2e {
    readonly data: HazardData;
}
