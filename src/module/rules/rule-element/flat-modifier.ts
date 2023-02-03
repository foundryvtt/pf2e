import { ActorType } from "@actor/data";
import { DeferredValueParams, ModifierPF2e, ModifierType, MODIFIER_TYPES } from "@actor/modifiers";
import { AbilityString } from "@actor/types";
import { ABILITY_ABBREVIATIONS } from "@actor/values";
import { ItemPF2e } from "@item";
import { DamageCategoryUnique, DAMAGE_CATEGORIES_UNIQUE } from "@system/damage";
import { objectHasKey, setHasElement, sluggify } from "@util";
import {
    ArrayField,
    BooleanField,
    ModelPropsFromSchema,
    NumberField,
    StringField,
} from "types/foundry/common/data/fields.mjs";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./";

const { fields } = foundry.data;

/**
 * Apply a constant modifier (or penalty/bonus) to a statistic or usage thereof
 * @category RuleElement
 */
class FlatModifierRuleElement extends RuleElementPF2e<FlatModifierSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    static override defineSchema(): FlatModifierSchema {
        return {
            ...super.defineSchema(),
            selector: new fields.ArrayField(new fields.StringField({ required: true, blank: false }), {
                required: true,
                nullable: false,
            }),
            type: new fields.StringField({
                required: true,
                choices: Array.from(MODIFIER_TYPES),
                initial: "untyped",
            }),
            ability: new fields.StringField({
                required: false,
                choices: Array.from(ABILITY_ABBREVIATIONS),
                initial: undefined,
            }),
            min: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
            max: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
            force: new fields.BooleanField(),
            hideIfDisabled: new fields.BooleanField(),
            fromEquipment: new fields.BooleanField({ initial: true }),
            damageType: new fields.StringField({ required: false, blank: false, initial: undefined }),
            damageCategory: new fields.StringField({
                required: false,
                blank: false,
                choices: Array.from(DAMAGE_CATEGORIES_UNIQUE),
                initial: undefined,
            }),
            critical: new fields.BooleanField({ required: false, nullable: true, initial: undefined }),
        };
    }

    get selectors(): string[] {
        return this.selector;
    }

    constructor(source: FlatModifierSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        if (typeof source.selector === "string") {
            source.selector = [source.selector];
        }

        if (!item.isOfType("physical") && source.type !== "item") {
            source.fromEquipment = false;
        }

        super(source, item, options);

        if (this.type === "ability") {
            if (setHasElement(ABILITY_ABBREVIATIONS, source.ability)) {
                this.data.label = typeof source.label === "string" ? source.label : CONFIG.PF2E.abilities[this.ability];
                this.data.value ??= `@actor.abilities.${this.ability}.mod`;
            } else {
                this.failValidation(
                    'A flat modifier of type "ability" must also have an "ability" property with an ability abbreviation'
                );
            }
        }

        this.critical =
            typeof source.critical === "boolean" && this.selectors.some((s) => s.includes("damage"))
                ? source.critical
                : null;

        if (this.force && this.type === "untyped") {
            this.failValidation("A forced bonus or penalty must have a type");
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        // Strip out the title ("Effect:", etc.) of the effect name
        const label = this.data.label.includes(":")
            ? this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "")
            : this.data.label;
        const slug = this.slug ?? (this.type === "ability" && this.ability ? this.ability : sluggify(label));

        const selectors = this.selectors.map((s) => this.resolveInjectedProperties(s)).filter((s) => !!s);
        if (selectors.length === 0 || !this.data.value) {
            this.failValidation("Flat modifier requires selector and value properties");
            return;
        }

        for (const selector of selectors) {
            const construct = (options: DeferredValueParams = {}): ModifierPF2e | null => {
                const resolvedValue = Number(this.resolveValue(this.data.value, 0, options)) || 0;
                if (this.ignored) return null;

                const finalValue = Math.clamped(resolvedValue, this.min ?? resolvedValue, this.max ?? resolvedValue);

                if (game.pf2e.variantRules.AutomaticBonusProgression.suppressRuleElement(this, finalValue)) {
                    return null;
                }

                const damageType = this.damageType ? this.resolveInjectedProperties(this.damageType) : null;
                if (damageType !== null && !objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
                    this.failValidation(`Unrecognized damage type: ${damageType}`);
                    return null;
                }

                const modifier = new ModifierPF2e({
                    slug,
                    label,
                    modifier: finalValue,
                    type: this.type,
                    ability: this.type === "ability" ? this.ability : null,
                    predicate: this.resolveInjectedProperties(this.predicate),
                    force: this.force,
                    damageType,
                    damageCategory: this.damageCategory,
                    critical: this.critical,
                    hideIfDisabled: this.hideIfDisabled,
                    source: this.item.uuid,
                });
                if (options.test) modifier.test(options.test);

                return modifier;
            };

            const modifiers = (this.actor.synthetics.statisticsModifiers[selector] ??= []);
            modifiers.push(construct);
        }
    }
}

interface FlatModifierRuleElement
    extends RuleElementPF2e<FlatModifierSchema>,
        ModelPropsFromSchema<FlatModifierSchema> {}

type FlatModifierSchema = RuleElementSchema & {
    /** All domains to add a modifier to */
    selector: ArrayField<StringField>;
    /** The modifier (or bonus/penalty) type */
    type: StringField<ModifierType>;
    /** If this is an ability modifier, the ability score it modifies */
    ability: StringField<AbilityString>;
    /** Hide this modifier from breakdown tooltips if it is disabled */
    min: NumberField<number, number, false>;
    max: NumberField<number, number, false>;
    hideIfDisabled: BooleanField;
    /** Whether to use this bonus/penalty/modifier even if it isn't the greatest magnitude */
    force: BooleanField;
    /** Whether this modifier comes from equipment or an equipment effect */
    fromEquipment: BooleanField;
    /** If a damage modifier, a damage type */
    damageType: StringField;
    /** If a damage modifier, a special category */
    damageCategory: StringField<DamageCategoryUnique>;
    /** If a damage modifier, whether it applies given the presence or absence of a critically successful attack roll */
    critical: BooleanField<boolean, boolean, true>;
};

interface FlatModifierSource extends RuleElementSource {
    selector?: unknown;
    min?: unknown;
    max?: unknown;
    type?: unknown;
    ability?: unknown;
    force?: unknown;
    damageType?: unknown;
    damageCategory?: unknown;
    critical?: unknown;
    hideIfDisabled?: unknown;
    fromEquipment?: unknown;
}

export { FlatModifierRuleElement, FlatModifierSource };
