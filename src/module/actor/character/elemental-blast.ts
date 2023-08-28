import { calculateMAPs } from "@actor/helpers.ts";
import { StatisticModifier } from "@actor/modifiers.ts";
import { AbilityItemPF2e } from "@item";
import { ActionTrait } from "@item/ability/types.ts";
import { WeaponTrait } from "@item/weapon/types.ts";
import { extractDamageSynthetics } from "@module/rules/helpers.ts";
import { ElementTrait, elementTraits } from "@scripts/config/traits.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckRoll } from "@system/check/index.ts";
import { DamagePF2e } from "@system/damage/damage.ts";
import { createDamageFormula } from "@system/damage/formula.ts";
import { applyDamageDiceOverrides } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { BaseDamageData, DamageRollContext, DamageType, SimpleDamageTemplate } from "@system/damage/types.ts";
import { DAMAGE_TYPE_ICONS } from "@system/damage/values.ts";
import { DEGREE_OF_SUCCESS } from "@system/degree-of-success.ts";
import { AttackRollParams, DamageRollParams } from "@system/rolls.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e, isObject, objectHasKey, traitSlugToObject } from "@util";
import * as R from "remeda";
import type {
    ArrayField,
    FilePathField,
    NumberField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import { CharacterPF2e } from "./document.ts";

class ElementalBlast {
    actor: CharacterPF2e;

    /** The actor's impulse statistic */
    statistic: Statistic | null;

    /** The actor's Elemental Blast item */
    item: AbilityItemPF2e<CharacterPF2e> | null;

    /** Blast element/damage-type configurations available to the character */
    configs: ElementalBlastConfig[];

    infusion: BlastInfusionData;

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
                new fields.StringField({ required: true, choices: () => CONFIG.PF2E.damageTypes, initial: undefined })
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
            range: new fields.SchemaField(
                {
                    increment: new fields.NumberField({
                        required: true,
                        integer: true,
                        positive: true,
                        nullable: false,
                    }),
                    max: new fields.NumberField({ required: true, integer: true, positive: true, nullable: false }),
                },
                { required: false, nullable: true, initial: null }
            ),
            traits: new fields.SchemaField({
                melee: new fields.ArrayField(
                    new fields.StringField<WeaponTrait, WeaponTrait, true, false, false>({
                        required: true,
                        nullable: false,
                        choices: () => CONFIG.PF2E.weaponTraits,
                        initial: undefined,
                    })
                ),
                ranged: new fields.ArrayField(
                    new fields.StringField<WeaponTrait, WeaponTrait, true, false, false>({
                        required: true,
                        nullable: false,
                        choices: () => CONFIG.PF2E.weaponTraits,
                        initial: undefined,
                    })
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
        const blasts = Object.values(kineticist.elementalBlast).map((b) => schema.clean(b));

        const validationFailures = blasts.flatMap((b) => schema.validate(b) ?? []);
        for (const failure of validationFailures) {
            throw failure.asError();
        }

        const domains = [...statistic.domains, ...statistic.check.domains, "elemental-blast-attack-roll"];
        const maps = calculateMAPs(item, { domains, options: this.actor.getRollOptions(domains) });

        return blasts.map((blast) => {
            const damageTypes: BlastConfigDamageType[] = blast.damageTypes.map((dt) => ({
                value: dt,
                label: CONFIG.PF2E.damageTypes[dt],
                selected: damageTypeSelections[blast.element] === dt,
                glyph: DAMAGE_TYPE_ICONS[dt] ?? "",
            }));
            const firstDamageType = damageTypes.at(0);
            if (firstDamageType && !damageTypes.some((dt) => dt.selected)) {
                firstDamageType.selected = true;
            }

            const range = infusion.range?.increment
                ? {
                      increment: infusion.range.increment,
                      max: infusion.range.max * 6,
                      label: game.i18n.format("PF2E.Action.Range.IncrementN", { n: infusion.range.increment }),
                  }
                : {
                      increment: null,
                      max: infusion.range?.max ?? blast.range,
                      label: game.i18n.format("PF2E.Action.Range.MaxN", { n: infusion.range?.max ?? blast.range }),
                  };

            return {
                ...blast,
                statistic,
                map1: statistic.check.mod + maps.map1,
                map2: statistic.check.mod + maps.map2,
                item,
                actionCost,
                damageTypes,
                range,
            };
        });
    }

    #prepareBlastInfusion(): BlastInfusionData {
        const schema = ElementalBlast.#blastInfusionSchema;
        const flag = this.item?.flags.pf2e.kineticist ?? {};
        const infusionData = isObject<{ infusion: unknown }>(flag) && isObject(flag.infusion) ? flag.infusion : {};
        return schema.clean(infusionData);
    }

    /** Get a elemental-blast configuration, throwing an error if none is found according to the arguments passed. */
    #getBlastConfig(element: ElementTrait, damageType: DamageType): ElementalBlastConfig {
        const config = this.configs.find(
            (c) => c.element === element && c.damageTypes.some((t) => t.value === damageType)
        );
        if (!config) {
            throw ErrorPF2e(
                `Elemental blast configuration of element ${element} and damage type ${damageType} not found.`
            );
        }

        return config;
    }

    /** Get all elemental-blast traits applicable to an element and damage-type combination. */
    #getTraits(element: ElementTrait, damageType: DamageType, melee: boolean): ActionTrait[] {
        const baseTraits = this.item?.system.traits.value ?? [];
        const infusionTraits = melee ? this.infusion.traits.melee : this.infusion.traits.ranged;
        return R.uniq(
            [...baseTraits, ...infusionTraits, element, damageType].filter(
                (t): t is ActionTrait => t in CONFIG.PF2E.actionTraits
            )
        ).sort();
    }

    /** Make an impulse attack roll as part of an elemental blast. */
    async attack(params: BlastAttackParams): Promise<Rolled<CheckRoll> | null> {
        const { item, statistic, actionCost } = this;
        const actionSlug = "elemental-blast";
        const kineticAura = this.actor.itemTypes.effect.find((e) => e.slug === "effect-kinetic-aura");
        if (!(statistic && item)) throw ErrorPF2e("Unable to blast");
        if (!kineticAura) throw ErrorPF2e("No kinetic gate");

        const meleeOrRanged = params.melee ? "melee" : "ranged";

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
        const mapIncreases = Math.clamped(params.mapIncreases ?? 0, 0, 2) || 0;
        const melee = !!(params.melee ?? true);

        const traits = this.#getTraits(element, damageType, melee).map((t) =>
            traitSlugToObject(t, CONFIG.PF2E.actionTraits)
        );

        const thisToken = this.actor.getActiveTokens(true, false).shift() ?? null;
        const targetToken = game.user.targets.first() ?? null;
        if (!params.melee && thisToken && targetToken && thisToken.distanceTo(targetToken) > blastConfig.range.max) {
            ui.notifications.warn("PF2E.Action.Strike.OutOfRange", { localize: true });
            return null;
        }

        const label = await renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
            title: item.name,
            glyph: actionCost.toString(),
            subtitle: game.i18n.format("PF2E.ActionsCheck.x-attack-roll", { type: statistic.label }),
        });

        return statistic.extend({ check: { domains: [`${actionSlug}-attack-roll`] } }).roll({
            identifier: `${blastConfig.element}.${params.damageType}.${meleeOrRanged}.${actionCost}`,
            action: actionSlug,
            attackNumber: mapIncreases + 1,
            target: targetToken?.actor ?? null,
            token: thisToken?.document ?? null,
            item: this.item,
            label,
            traits,
            melee,
            range: melee ? null : blastConfig.range,
            damaging: true,
            dc: { slug: "ac" },
            extraRollOptions: [`action:${actionSlug}`, `action:cost:${actionCost}`],
            ...eventToRollParams(params.event),
        });
    }

    /** Make a damage roll as part of an elemental blast. */
    damage(params: BlastDamageParams & { getFormula: true }): Promise<string>;
    damage(params: BlastDamageParams): Promise<Rolled<DamageRoll> | null | string>;
    async damage(params: BlastDamageParams): Promise<Rolled<DamageRoll> | null | string> {
        const { item, statistic } = this;
        if (!(item && statistic)) return null;

        const melee = !!(params.melee ?? true);
        const blastConfig = this.#getBlastConfig(params.element, params.damageType);
        const outcome = params.outcome ?? "success";
        const meleeOrRanged = melee ? "melee" : "ranged";
        const actionCost = Math.clamped(Number(params.actionCost ?? this.actionCost), 1, 2) || 1;
        const actionSlug = "elemental-blast";
        const domains = ["damage", "impulse-damage", `${actionSlug}-damage`];
        const targetToken = game.user.targets.first() ?? null;
        const traits = this.#getTraits(params.element, params.damageType, melee);

        const context = await this.actor.getDamageRollContext({
            viewOnly: params.getFormula ?? false,
            statistic: statistic.check,
            target: { token: targetToken },
            domains,
            outcome,
            melee,
            options: new Set([`action:${actionSlug}`, `action:cost:${actionCost}`, meleeOrRanged, ...traits]),
        });

        const damageSynthetics = extractDamageSynthetics(this.actor, domains, { test: context.options });
        const modifiers = new StatisticModifier("", damageSynthetics.modifiers).modifiers;
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
        applyDamageDiceOverrides([baseDamage], damageSynthetics.dice);

        const damageData = createDamageFormula(
            {
                dice: damageSynthetics.dice,
                modifiers,
                base: [baseDamage],
                ignoredResistances: [],
            },
            outcome === "success" ? DEGREE_OF_SUCCESS.SUCCESS : DEGREE_OF_SUCCESS.CRITICAL_SUCCESS
        );
        const roll = new DamageRoll(damageData.formula);

        if (params.getFormula) return roll.formula;

        const damageTemplate: SimpleDamageTemplate = {
            name: `${game.i18n.localize("PF2E.DamageRoll")}: ${item.name}`,
            notes: [],
            traits,
            materials: [],
            modifiers,
            damage: { roll, breakdown: damageData.breakdown },
        };
        const damageContext: DamageRollContext = {
            type: "damage-roll",
            sourceType: "attack",
            self: context.self,
            target: context.target,
            outcome,
            options: context.options,
            range: melee ? null : blastConfig.range,
            domains,
            ...eventToRollParams(params.event),
        };

        return DamagePF2e.roll(damageTemplate, damageContext);
    }

    /** Set damage type according to the user's selection on the PC sheet */
    async setDamageType({ element, damageType }: { element: ElementTrait; damageType: DamageType }): Promise<void> {
        if (!this.configs.some((c) => c.element === element && c.damageTypes.some((dt) => dt.value === damageType))) {
            throw ErrorPF2e(`Damage type "${damageType}" not available for ${element}`);
        }
        await this.item?.update({ [`flags.pf2e.damageSelections.${element}`]: damageType });
    }
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
    range: {
        increment: number | null;
        max: number;
        label: string;
    };
    statistic: Statistic;
    actionCost: 1 | 2;
    map1: number;
    map2: number;
}

interface BlastConfigDamageType {
    value: DamageType;
    label: string;
    selected: boolean;
    glyph: string;
}

export { ElementalBlast, ElementalBlastConfig };
