import { AttackTraitHelpers } from "@actor/creature/helpers.ts";
import { calculateMAPs } from "@actor/helpers.ts";
import { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import type { AbilityItemPF2e } from "@item";
import { ActionTrait } from "@item/ability/types.ts";
import { RangeData } from "@item/types.ts";
import { WeaponTrait } from "@item/weapon/types.ts";
import {
    extractDamageDice,
    extractModifierAdjustments,
    extractModifiers,
    processDamageCategoryStacking,
} from "@module/rules/helpers.ts";
import { ElementTrait, elementTraits } from "@scripts/config/traits.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckRoll } from "@system/check/index.ts";
import { DamagePF2e } from "@system/damage/damage.ts";
import { DamageModifierDialog } from "@system/damage/dialog.ts";
import { createDamageFormula } from "@system/damage/formula.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import {
    BaseDamageData,
    DamageFormulaData,
    DamageRollContext,
    DamageType,
    SimpleDamageTemplate,
} from "@system/damage/types.ts";
import { DAMAGE_TYPE_ICONS } from "@system/damage/values.ts";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success.ts";
import { AttackRollParams, DamageRollParams } from "@system/rolls.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e, isObject, objectHasKey, signedInteger } from "@util";
import * as R from "remeda";
import type {
    ArrayField,
    FilePathField,
    NumberField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import type { CharacterPF2e } from "./document.ts";

class ElementalBlast {
    actor: CharacterPF2e;

    /** The actor's impulse statistic */
    statistic: Statistic | null;

    /** The actor's Elemental Blast item */
    item: AbilityItemPF2e<CharacterPF2e> | null;

    /** Blast element/damage-type configurations available to the character */
    configs: ElementalBlastConfig[];

    /** Modifications of the blast from infusions */
    infusion: BlastInfusionData | null;

    constructor(actor: CharacterPF2e) {
        if (!actor.isOfType("character")) throw ErrorPF2e("Must construct with a PC");
        this.actor = actor;
        this.statistic = this.actor.getStatistic("impulse");
        this.item = this.actor.itemTypes.action.find((a) => a.slug === "elemental-blast") ?? null;
        this.infusion = this.#prepareBlastInfusion();
        this.configs = this.#prepareBlastConfigs();
    }

    static #blastConfigSchema = ((): SchemaField<BlastConfigSchema> => {
        const { fields } = foundry.data;

        return new fields.SchemaField({
            element: new fields.StringField<ElementTrait, ElementTrait, true, false, false>({
                required: true,
                choices: () => CONFIG.PF2E.elementTraits,
                initial: undefined,
            }),
            label: new fields.StringField({ required: true, blank: false, initial: undefined }),
            img: new fields.FilePathField({
                required: true,
                categories: ["IMAGE"],
                nullable: false,
                initial: "systems/pf2e/icons/default-icons/spell.svg" as ImageFilePath,
            }),
            damageTypes: new fields.ArrayField(
                new fields.StringField({ required: true, choices: () => CONFIG.PF2E.damageTypes, initial: undefined }),
            ),
            dieFaces: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                choices: [6, 8],
                initial: undefined,
            } as const),
            range: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                positive: true,
                initial: undefined,
            }),
        });
    })();

    static #blastInfusionSchema = ((): SchemaField<BlastInfusionSchema> => {
        const { fields } = foundry.data;

        return new fields.SchemaField({
            damageTypes: new fields.ArrayField(
                new fields.StringField({ required: true, choices: () => CONFIG.PF2E.damageTypes, initial: undefined }),
            ),
            range: new fields.SchemaField(
                {
                    increment: new fields.NumberField({
                        required: true,
                        integer: true,
                        positive: true,
                        nullable: false,
                    }),
                    max: new fields.NumberField({
                        required: true,
                        integer: true,
                        positive: true,
                        nullable: false,
                    }),
                },
                { required: false, nullable: true, initial: null },
            ),
            traits: new fields.SchemaField({
                melee: new fields.ArrayField(
                    new fields.StringField<WeaponTrait, WeaponTrait, true, false, false>({
                        required: true,
                        nullable: false,
                        choices: () => CONFIG.PF2E.weaponTraits,
                        initial: undefined,
                    }),
                ),
                ranged: new fields.ArrayField(
                    new fields.StringField<WeaponTrait, WeaponTrait, true, false, false>({
                        required: true,
                        nullable: false,
                        choices: () => CONFIG.PF2E.weaponTraits,
                        initial: undefined,
                    }),
                ),
            }),
        });
    })();

    get actionCost(): 1 | 2 {
        const cost = this.item?.flags.pf2e.rulesSelections.actionCost ?? 1;
        if (cost !== 1 && cost !== 2) throw ErrorPF2e("Action cost must be 1 or 2");
        return cost;
    }

    /** Retrieve and process elemental blast data from a flag set by rule elements. */
    #prepareBlastConfigs(): ElementalBlastConfig[] {
        const { item, statistic, actionCost, infusion } = this;
        if (!item || !statistic) return [];
        const { kineticist } = this.actor.flags.pf2e;
        if (!isObject(kineticist) || !("elementalBlast" in kineticist) || !isObject(kineticist.elementalBlast)) {
            return [];
        }
        const schema = ElementalBlast.#blastConfigSchema;
        const damageTypeSelections = ((): Record<string, unknown> => {
            const flag = item.flags.pf2e.damageSelections;
            return isObject<Record<string, unknown>>(flag) ? flag : {};
        })();
        const blasts = Object.values(kineticist.elementalBlast)
            .filter((b: unknown) => isObject(b) && "element" in b)
            .map((b) => schema.clean(b));

        const validationFailures = blasts.flatMap((b) => schema.validate(b) ?? []);
        for (const failure of validationFailures) {
            throw failure.asError();
        }

        // Set in the same fashion as weapons
        item.flags.pf2e.attackItemBonus =
            statistic.check.modifiers.find((m) => m.enabled && ["item", "potency"].includes(m.type))?.value ?? 0;

        // In case of infusions, get separate MAPs for melee and ranged attacks
        const maps = (() => {
            const domains = [...statistic.check.domains, "elemental-blast-attack-roll"];
            const options = this.actor.getRollOptions(domains);

            const modifier = statistic.check.mod;
            const mapsFor = (melee: boolean): { map1: string; map2: string } => {
                const penalties = calculateMAPs(this.#createModifiedItem({ melee }) ?? item, { domains, options });
                return {
                    map1: game.i18n.format("PF2E.MAPAbbreviationValueLabel", {
                        value: signedInteger(modifier + penalties.map1),
                        penalty: penalties.map1,
                    }),
                    map2: game.i18n.format("PF2E.MAPAbbreviationValueLabel", {
                        value: signedInteger(modifier + penalties.map2),
                        penalty: penalties.map2,
                    }),
                };
            };

            return { melee: mapsFor(true), ranged: mapsFor(false) };
        })();

        return blasts.map((blast) => {
            const damageTypes: BlastConfigDamageType[] = R.uniq(
                R.compact([blast.damageTypes, this.infusion?.damageTypes].flat()),
            )
                .map((dt) => ({
                    value: dt,
                    label: game.i18n.localize(CONFIG.PF2E.damageTypes[dt]),
                    icon: DAMAGE_TYPE_ICONS[dt] ?? "",
                    selected: damageTypeSelections[blast.element] === dt,
                }))
                .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
            const firstDamageType = damageTypes.at(0);
            if (firstDamageType && !damageTypes.some((dt) => dt.selected)) {
                firstDamageType.selected = true;
            }

            const maxRange = infusion?.range?.max ?? blast.range;
            const range = infusion?.range?.increment
                ? {
                      increment: infusion.range.increment,
                      max: infusion.range.increment * 6,
                      label: game.i18n.format("PF2E.Action.Range.IncrementN", { n: infusion.range.increment }),
                  }
                : {
                      increment: null,
                      max: maxRange,
                      label: game.i18n.format("PF2E.Action.Range.MaxN", { n: maxRange }),
                  };

            return {
                ...blast,
                statistic,
                maps,
                item,
                actionCost,
                damageTypes,
                range,
            };
        });
    }

    #prepareBlastInfusion(): BlastInfusionData | null {
        const schema = ElementalBlast.#blastInfusionSchema;
        const flag = this.actor.flags.pf2e.kineticist;
        const infusionData =
            isObject<{ elementalBlast: unknown }>(flag) && isObject<{ infusion: unknown }>(flag.elementalBlast)
                ? flag.elementalBlast.infusion
                : null;

        return isObject(infusionData) ? schema.clean(infusionData) : null;
    }

    /** Get a elemental-blast configuration, throwing an error if none is found according to the arguments passed. */
    #getBlastConfig(element: ElementTrait, damageType: DamageType): ElementalBlastConfig {
        const config = this.configs.find(
            (c) => c.element === element && c.damageTypes.some((t) => t.value === damageType),
        );
        if (!config) {
            throw ErrorPF2e(
                `Elemental blast configuration of element ${element} and damage type ${damageType} not found.`,
            );
        }

        return config;
    }

    #createModifiedItem({
        melee,
        config,
        damageType,
    }: CreateModifiedItemParams): AbilityItemPF2e<CharacterPF2e> | null {
        const { item } = this;
        if (!item) return null;

        const traits = ((): ActionTrait[] => {
            const baseTraits = this.item?.system.traits.value ?? [];
            const infusionTraits = melee ? this.infusion?.traits.melee : this.infusion?.traits.ranged;
            return R.uniq(
                R.compact([baseTraits, infusionTraits, config?.element, damageType].flat()).filter(
                    (t): t is ActionTrait => t in CONFIG.PF2E.actionTraits,
                ),
            ).sort();
        })();

        const clone = item.clone({ system: { traits: { value: traits } } }, { keepId: true });
        clone.range = melee ? null : config?.range ?? null;

        return clone;
    }

    /** Make an impulse attack roll as part of an elemental blast. */
    async attack(params: BlastAttackParams): Promise<Rolled<CheckRoll> | null> {
        const { statistic, actionCost } = this;
        if (!(statistic && this.item)) throw ErrorPF2e("Unable to blast");
        if (!this.actor.rollOptions.all["self:effect:kinetic-aura"]) {
            throw ErrorPF2e("No kinetic gate");
        }

        const { element, damageType } = params;
        if (!element) throw ErrorPF2e("No element provided");
        if (!objectHasKey(elementTraits, element)) {
            throw ErrorPF2e(`Unrecognized element: ${element}`);
        }
        if (!damageType) throw ErrorPF2e("No damage type provided");
        if (!objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
            throw ErrorPF2e(`Unrecognized damage type: ${damageType}`);
        }

        const blastConfig = this.#getBlastConfig(element, damageType);
        const melee = !!(params.melee ??= true);
        const item = this.#createModifiedItem({ config: blastConfig, damageType, melee });
        if (!item) return null;

        const thisToken = this.actor.getActiveTokens(true, false).shift() ?? null;
        const targetToken = game.user.targets.first() ?? null;
        if (!params.melee && thisToken && targetToken && thisToken.distanceTo(targetToken) > blastConfig.range.max) {
            ui.notifications.warn("PF2E.Action.Strike.OutOfRange", { localize: true });
            return null;
        }

        const actionSlug = "elemental-blast";
        const blastStatistic = statistic.extend({
            check: {
                domains: [`${actionSlug}-attack-roll`],
                modifiers: AttackTraitHelpers.createAttackModifiers({ item }),
            },
        });
        const label = await renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
            title: item.name,
            glyph: actionCost.toString(),
            subtitle: game.i18n.format("PF2E.ActionsCheck.x-attack-roll", { type: statistic.label }),
        });
        const meleeOrRanged = params.melee ? "melee" : "ranged";
        const mapIncreases = Math.clamped(params.mapIncreases ?? 0, 0, 2) || 0;

        return blastStatistic.roll({
            identifier: `${blastConfig.element}.${params.damageType}.${meleeOrRanged}.${actionCost}`,
            action: actionSlug,
            attackNumber: mapIncreases + 1,
            target: targetToken?.actor ?? null,
            token: thisToken?.document ?? null,
            item,
            label,
            traits: item.system.traits.value,
            melee,
            damaging: true,
            dc: { slug: "ac" },
            extraRollOptions: [`action:${actionSlug}`, `action:cost:${actionCost}`],
            ...eventToRollParams(params.event, { type: "check" }),
        });
    }

    /** Make a damage roll as part of an elemental blast. */
    damage(params: BlastDamageParams & { getFormula: true }): Promise<string | null>;
    damage(params: BlastDamageParams): Promise<Rolled<DamageRoll> | string | null>;
    async damage(params: BlastDamageParams): Promise<Rolled<DamageRoll> | string | null> {
        if (!this.statistic) return null;

        const melee = !!(params.melee ??= true);
        const blastConfig = this.#getBlastConfig(params.element, params.damageType);
        if (!blastConfig) return null;

        const item = this.#createModifiedItem({ config: blastConfig, damageType: params.damageType, melee });
        if (!item) return null;

        const outcome = params.outcome ?? "success";
        const meleeOrRanged = melee ? "melee" : "ranged";
        const actionCost = Math.clamped(Number(params.actionCost ?? this.actionCost), 1, 2) || 1;
        const actionSlug = "elemental-blast";
        const domains = ["damage", "attack-damage", "impulse-damage", `${actionSlug}-damage`];
        const targetToken = game.user.targets.first() ?? null;
        item.flags.pf2e.attackItemBonus =
            blastConfig.statistic.check.modifiers.find((m) => m.enabled && ["item", "potency"].includes(m.type))
                ?.value ?? 0;

        const context = await this.actor.getDamageRollContext({
            viewOnly: params.getFormula ?? false,
            statistic: this.statistic.check,
            item,
            target: { token: targetToken },
            domains,
            outcome,
            melee,
            checkContext: params.checkContext,
            options: new Set([`action:${actionSlug}`, `action:cost:${actionCost}`, meleeOrRanged, ...item.traits]),
        });

        const baseDamage: BaseDamageData = {
            category: null,
            damageType: params.damageType,
            terms: [
                {
                    dice: { number: 1, faces: blastConfig.dieFaces },
                    modifier: 0,
                },
            ],
        };
        const damageSynthetics = processDamageCategoryStacking([baseDamage], {
            modifiers: extractModifiers(context.self.actor.synthetics, domains, {
                test: context.options,
                resolvables: { blast: item },
            }),
            dice: extractDamageDice(context.self.actor.synthetics.damageDice, domains, {
                test: context.options,
                resolvables: { blast: item, target: context.target?.actor ?? null },
            }),
            test: context.options,
        });
        const extraModifiers = R.compact([...damageSynthetics.modifiers, this.#strengthModToDamage(item, domains)]);
        const modifiers = new StatisticModifier("", extraModifiers).modifiers;
        const formulaData: DamageFormulaData = {
            dice: damageSynthetics.dice,
            modifiers,
            base: [baseDamage],
            ignoredResistances: [],
        };

        const damageContext: DamageRollContext = {
            type: "damage-roll",
            sourceType: "attack",
            self: context.self,
            target: context.target,
            outcome,
            options: context.options,
            domains,
            ...eventToRollParams(params.event, { type: "damage" }),
        };

        if (!params.getFormula && !damageContext.skipDialog) {
            const rolled = await new DamageModifierDialog({ formulaData, context: damageContext }).resolve();
            if (!rolled) return null;
        }

        const damageData = createDamageFormula(
            formulaData,
            outcome === "success" ? DEGREE_OF_SUCCESS.SUCCESS : DEGREE_OF_SUCCESS.CRITICAL_SUCCESS,
        );
        const roll = new DamageRoll(damageData.formula);

        if (params.getFormula) return roll.formula;

        const damageTemplate: SimpleDamageTemplate = {
            name: `${game.i18n.localize("PF2E.DamageRoll")}: ${item.name}`,
            traits: item.system.traits.value,
            materials: [],
            modifiers,
            damage: { roll, breakdown: damageData.breakdown },
        };

        return DamagePF2e.roll(damageTemplate, damageContext);
    }

    #strengthModToDamage(item: AbilityItemPF2e, domains: string[]): ModifierPF2e | null {
        if (!item.range) return null;
        const strengthModValue = this.actor.abilities.str.mod;
        const { traits } = item;
        const modifierValue = traits.has("thrown")
            ? strengthModValue
            : traits.has("propulsive")
            ? strengthModValue < 0
                ? strengthModValue
                : Math.floor(strengthModValue / 2)
            : null;

        return typeof modifierValue === "number"
            ? new ModifierPF2e({
                  slug: "str",
                  label: CONFIG.PF2E.abilities.str,
                  ability: "str",
                  modifier: modifierValue,
                  type: "ability",
                  adjustments: extractModifierAdjustments(this.actor.synthetics.modifierAdjustments, domains, "str"),
              })
            : null;
    }

    /** Set damage type according to the user's selection on the PC sheet */
    async setDamageType({ element, damageType }: { element: ElementTrait; damageType: DamageType }): Promise<void> {
        if (!this.configs.some((c) => c.element === element && c.damageTypes.some((dt) => dt.value === damageType))) {
            throw ErrorPF2e(`Damage type "${damageType}" not available for ${element}`);
        }
        await this.item?.update({ [`flags.pf2e.damageSelections.${element}`]: damageType });
    }
}

interface CreateModifiedItemParams {
    melee: boolean;
    config?: ElementalBlastConfig;
    damageType?: DamageType;
}

interface BlastAttackParams extends AttackRollParams {
    mapIncreases: number;
    element: ElementTrait;
    damageType: DamageType;
    melee: boolean;
}

interface BlastDamageParams extends DamageRollParams {
    element: ElementTrait;
    damageType: DamageType;
    melee: boolean;
    actionCost?: number;
    outcome?: "success" | "criticalSuccess";
}

type BlastConfigSchema = {
    element: StringField<ElementTrait, ElementTrait, true, false, false>;
    label: StringField<string, string, true, false, false>;
    img: FilePathField<ImageFilePath, ImageFilePath, true, false, true>;
    damageTypes: ArrayField<StringField<DamageType, DamageType, true, false, false>>;
    range: NumberField<number, number, true, false, false>;
    dieFaces: NumberField<6 | 8, 6 | 8, true, false, false>;
};

type BlastInfusionSchema = {
    damageTypes: ArrayField<StringField<DamageType, DamageType, true, false, false>>;
    range: SchemaField<
        {
            increment: NumberField<number, number, true, false, false>;
            max: NumberField<number, number, true, false, false>;
        },
        { increment: number; max: number },
        { increment: number; max: number },
        false,
        true,
        true
    >;
    traits: SchemaField<{
        melee: ArrayField<StringField<WeaponTrait, WeaponTrait, true, false, false>>;
        ranged: ArrayField<StringField<WeaponTrait, WeaponTrait, true, false, false>>;
    }>;
};

type BlastInfusionData = ModelPropsFromSchema<BlastInfusionSchema>;

interface ElementalBlastConfig extends Omit<ModelPropsFromSchema<BlastConfigSchema>, "damageTypes" | "range"> {
    damageTypes: BlastConfigDamageType[];
    range: RangeData & { label: string };
    statistic: Statistic;
    actionCost: 1 | 2;
    maps: {
        melee: { map1: string; map2: string };
        ranged: { map1: string; map2: string };
    };
}

interface BlastConfigDamageType {
    value: DamageType;
    label: string;
    icon: string;
    selected: boolean;
}

export { ElementalBlast, type ElementalBlastConfig };
