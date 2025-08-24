import type { ActorPF2e } from "@actor";
import { AttackTraitHelpers } from "@actor/creature/helpers.ts";
import { calculateMAPs } from "@actor/helpers.ts";
import { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { DamageContext } from "@actor/roll-context/damage.ts";
import type { Rolled } from "@client/dice/roll.d.mts";
import type { ImageFilePath } from "@common/constants.d.mts";
import type { AbilityItemPF2e } from "@item";
import type { AbilityTrait } from "@item/ability/types.ts";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import type { RangeData } from "@item/types.ts";
import type { WeaponDamage } from "@item/weapon/data.ts";
import type { WeaponTrait } from "@item/weapon/types.ts";
import {
    extractDamageDice,
    extractModifierAdjustments,
    extractModifiers,
    processDamageCategoryStacking,
} from "@module/rules/helpers.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import { effectTraits } from "@scripts/config/traits.ts";
import { CheckRoll } from "@system/check/index.ts";
import { DamagePF2e } from "@system/damage/damage.ts";
import { DamageModifierDialog } from "@system/damage/dialog.ts";
import { createDamageFormula } from "@system/damage/formula.ts";
import { DamageCategorization, processBaseDamage } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type {
    BaseDamageData,
    DamageDamageContext,
    DamageDiceFaces,
    DamageFormulaData,
    DamageType,
    SimpleDamageTemplate,
} from "@system/damage/types.ts";
import { DAMAGE_TYPE_ICONS } from "@system/damage/values.ts";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success.ts";
import type { AttackRollParams, DamageRollParams } from "@system/rolls.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e, objectHasKey, signedInteger } from "@util";
import * as R from "remeda";
import type { CharacterPF2e } from "./document.ts";
import fields = foundry.data.fields;

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

    static #blastConfigSchema = ((): fields.SchemaField<BlastConfigSchema> => {
        return new fields.SchemaField({
            element: new fields.StringField<EffectTrait, EffectTrait, true, false, false>({
                required: true,
                choices: () => CONFIG.PF2E.effectTraits,
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

    static #blastInfusionSchema = ((): fields.SchemaField<BlastInfusionSchema> => {
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
        const kineticist = this.actor.flags.pf2e.kineticist;
        if (!R.isPlainObject(kineticist) || !R.isPlainObject(kineticist.elementalBlast)) {
            return [this.#getDisabledBlast(statistic, item.name)];
        }
        const schema = ElementalBlast.#blastConfigSchema;
        const damageTypeSelections = ((): Record<string, unknown> => {
            const flag = item.flags.pf2e.damageSelections;
            return R.isPlainObject(flag) ? flag : {};
        })();
        const blasts = Object.values(kineticist.elementalBlast)
            .filter((b: unknown) => R.isPlainObject(b) && "element" in b)
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

            const mapsFor = (melee: boolean): { map0: string; map1: string; map2: string } => {
                const modifiedItem = this.#createModifiedItem({ melee }) ?? item;
                const blastStatistic = this.#createAttackStatistic(statistic, modifiedItem);
                const modifier = blastStatistic.check.mod;
                const penalties = calculateMAPs(modifiedItem, { domains, options });
                return {
                    map0: signedInteger(modifier),
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
            const damageTypes: BlastConfigDamageType[] = R.unique(
                [blast.damageTypes, this.infusion?.damageTypes].flat().filter(R.isTruthy),
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
                item,
                ready: true,
                maps,
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
            R.isPlainObject(flag) && R.isPlainObject(flag.elementalBlast) ? flag.elementalBlast.infusion : null;

        return R.isPlainObject(infusionData) ? schema.clean(infusionData) : null;
    }

    /** Get a elemental-blast configuration, throwing an error if none is found according to the arguments passed. */
    #getBlastConfig(element: EffectTrait, damageType: DamageType): ElementalBlastConfig {
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

    #getDisabledBlast(statistic: Statistic, label: string): ElementalBlastConfig {
        if (!this.item) throw ErrorPF2e("Unexpected missing Elemental Blast item");
        return {
            ready: false,
            statistic,
            item: this.item,
            img: "icons/magic/sonic/projectile-shock-wave-blue.webp",
            element: "fire",
            dieFaces: 6,
            label,
            maps: { melee: { map0: "", map1: "", map2: "" }, ranged: { map0: "", map1: "", map2: "" } },
            actionCost: this.actionCost,
            damageTypes: [{ value: "fire", label: "", icon: "", selected: true }],
            range: { increment: null, max: 30, label: "" },
        };
    }

    #createModifiedItem({
        melee,
        config,
        damageType,
    }: CreateModifiedItemParams): AbilityItemPF2e<CharacterPF2e> | null {
        const item = this.item;
        if (!item) return null;

        const traits = ((): AbilityTrait[] => {
            const baseTraits = this.item?.system.traits.value ?? [];
            const infusionTraits = melee ? this.infusion?.traits.melee : this.infusion?.traits.ranged;
            return R.unique(
                [baseTraits, infusionTraits, config?.element, damageType]
                    .flat()
                    .filter((t): t is AbilityTrait => !!t && t in CONFIG.PF2E.actionTraits),
            ).sort();
        })();

        const clone = item.clone({ system: { traits: { value: traits } } }, { keepId: true });
        clone.range = melee ? null : (config?.range ?? null);
        clone.isMelee = melee;

        return clone;
    }

    #createAttackStatistic(statistic: Statistic, item: AbilityItemPF2e<ActorPF2e>): Statistic {
        const newDomain = "elemental-blast-attack-roll";
        const domains = [...statistic.check.domains, newDomain];
        return statistic.extend({
            check: {
                domains: [newDomain],
                modifiers: AttackTraitHelpers.createAttackModifiers({ item, domains }),
            },
        });
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
        if (!objectHasKey(effectTraits, element)) {
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

        const blastStatistic = this.#createAttackStatistic(statistic, item);
        const label = await fa.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
            title: item.name,
            glyph: actionCost.toString(),
            subtitle: game.i18n.format("PF2E.ActionsCheck.x-attack-roll", { type: statistic.label }),
        });
        const meleeOrRanged = params.melee ? "melee" : "ranged";
        const mapIncreases = Math.clamp(params.mapIncreases ?? 0, 0, 2) || 0;
        const actionSlug = "elemental-blast";

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
            extraRollOptions: [
                `action:${actionSlug}`,
                `action:cost:${this.actionCost}`,
                `self:action:cost:${this.actionCost}`,
                `self:action:${meleeOrRanged}`,
                meleeOrRanged,
                `item:${meleeOrRanged}`,
            ],
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
        const actionCost = Math.clamp(Number(params.actionCost ?? this.actionCost), 1, 2) || 1;
        const actionSlug = "elemental-blast";
        const domains = ["damage", "attack-damage", "impulse-damage", `${actionSlug}-damage`];
        const targetToken = game.user.targets.first()?.document ?? null;
        const damageCategory = DamageCategorization.fromDamageType(params.damageType);
        item.flags.pf2e.attackItemBonus =
            blastConfig.statistic.check.modifiers.find((m) => m.enabled && ["item", "potency"].includes(m.type))
                ?.value ?? 0;

        const context = await new DamageContext({
            viewOnly: params.getFormula ?? false,
            origin: { actor: this.actor, statistic: this.statistic, item },
            target: { token: targetToken },
            domains,
            outcome,
            checkContext: params.checkContext,
            options: new Set(
                [
                    `action:${actionSlug}`,
                    `action:cost:${actionCost}`,
                    `self:action:slug:${actionSlug}`,
                    `self:action:cost:${actionCost}`,
                    `self:action:${meleeOrRanged}`,
                    meleeOrRanged,
                    `item:${meleeOrRanged}`,
                    `item:damage:type:${params.damageType}`,
                    damageCategory ? `item:damage:category:${damageCategory}` : null,
                    ...item.traits,
                ].filter(R.isTruthy),
            ),
        }).resolve();
        if (!context.origin) return null;

        const processedDamage: WeaponDamage = processBaseDamage(
            "elemental-blast-damage",
            {
                category: null,
                damageType: params.damageType,
                dice: 1,
                die: `d${blastConfig.dieFaces}`,
                modifier: 0,
                persistent: null,
            },
            { actor: context.origin.actor, item, domains, options: context.options },
        );
        const baseDamage: BaseDamageData = {
            category: null,
            damageType: processedDamage.damageType,
            terms: [
                {
                    modifier: 0,
                    dice: {
                        number: processedDamage.dice,
                        faces: Number(processedDamage.die?.replace(/^d/, "")) as DamageDiceFaces,
                    },
                },
            ],
        };

        const damageSynthetics = processDamageCategoryStacking([baseDamage], {
            modifiers: extractModifiers(context.origin.actor.synthetics, domains, {
                test: context.options,
                resolvables: { blast: item },
            }),
            dice: extractDamageDice(context.origin.actor.synthetics.damageDice, {
                selectors: domains,
                test: context.options,
                resolvables: { blast: item, target: context.target?.actor ?? null },
            }),
            test: context.options,
        });
        const extraModifiers = [...damageSynthetics.modifiers, this.#strengthModToDamage(item, domains)].filter(
            R.isTruthy,
        );

        // Forceful trait
        if (item.system.traits.value.includes("forceful")) {
            const diceNumber = processedDamage.dice;
            extraModifiers.push(
                new ModifierPF2e({
                    slug: "forceful-second",
                    label: "PF2E.Item.Weapon.Forceful.Second",
                    modifier: diceNumber,
                    type: "circumstance",
                    ignored: true,
                }),
                new ModifierPF2e({
                    slug: "forceful-third",
                    label: "PF2E.Item.Weapon.Forceful.Third",
                    modifier: 2 * diceNumber,
                    type: "circumstance",
                    ignored: true,
                }),
            );
        }

        const modifiers = new StatisticModifier("", extraModifiers).modifiers;
        const formulaData: DamageFormulaData = {
            dice: damageSynthetics.dice,
            modifiers,
            base: [baseDamage],
        };

        const damageContext: DamageDamageContext = {
            type: "damage-roll",
            sourceType: "attack",
            self: context.origin,
            target: context.target,
            outcome,
            options: context.options,
            domains,
            traits: item.system.traits.value,
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
    async setDamageType({ element, damageType }: { element: EffectTrait; damageType: DamageType }): Promise<void> {
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
    element: EffectTrait;
    damageType: DamageType;
    melee: boolean;
}

interface BlastDamageParams extends DamageRollParams {
    element: EffectTrait;
    damageType: DamageType;
    melee: boolean;
    actionCost?: number;
    outcome?: "success" | "criticalSuccess";
}

type BlastConfigSchema = {
    element: fields.StringField<EffectTrait, EffectTrait, true, false, false>;
    label: fields.StringField<string, string, true, false, false>;
    img: fields.FilePathField<ImageFilePath, ImageFilePath, true, false, true>;
    damageTypes: fields.ArrayField<fields.StringField<DamageType, DamageType, true, false, false>>;
    range: fields.NumberField<number, number, true, false, false>;
    dieFaces: fields.NumberField<6 | 8, 6 | 8, true, false, false>;
};

type BlastInfusionSchema = {
    damageTypes: fields.ArrayField<fields.StringField<DamageType, DamageType, true, false, false>>;
    range: fields.SchemaField<
        {
            increment: fields.NumberField<number, number, true, false, false>;
            max: fields.NumberField<number, number, true, false, false>;
        },
        { increment: number; max: number },
        { increment: number; max: number },
        false,
        true,
        true
    >;
    traits: fields.SchemaField<{
        melee: fields.ArrayField<fields.StringField<WeaponTrait, WeaponTrait, true, false, false>>;
        ranged: fields.ArrayField<fields.StringField<WeaponTrait, WeaponTrait, true, false, false>>;
    }>;
};

type BlastInfusionData = fields.ModelPropsFromSchema<BlastInfusionSchema>;

interface ElementalBlastConfig extends Omit<fields.ModelPropsFromSchema<BlastConfigSchema>, "damageTypes" | "range"> {
    damageTypes: BlastConfigDamageType[];
    range: RangeData & { label: string };
    statistic: Statistic;
    item: AbilityItemPF2e<CharacterPF2e>;
    actionCost: 1 | 2;
    ready: boolean;
    maps: {
        melee: { map0: string; map1: string; map2: string };
        ranged: { map0: string; map1: string; map2: string };
    };
}

interface BlastConfigDamageType {
    value: DamageType;
    label: string;
    icon: string;
    selected: boolean;
}

export { ElementalBlast, type ElementalBlastConfig };
