import { DeferredValueParams, MODIFIER_TYPES, Modifier, ModifierType } from "@actor/modifiers.ts";
import { AttributeString } from "@actor/types.ts";
import { damageCategoriesUnique } from "@scripts/config/damage.ts";
import { DamageCategoryUnique } from "@system/damage/types.ts";
import {
    DataUnionField,
    PredicateField,
    SlugField,
    StrictBooleanField,
    StrictStringField,
} from "@system/schema-data-fields.ts";
import { objectHasKey, sluggify } from "@util";
import { RuleElement, RuleElementOptions } from "./base.ts";
import {
    ModelPropsFromRESchema,
    ResolvableValueField,
    RuleElementSchema,
    RuleElementSource,
    RuleValue,
} from "./data.ts";
import fields = foundry.data.fields;

/**
 * Apply a constant modifier (or penalty/bonus) to a statistic or usage thereof
 * @category RuleElement
 */
class FlatModifierRuleElement extends RuleElement<FlatModifierSchema> {
    constructor(source: FlatModifierSource, options: RuleElementOptions) {
        super(source, options);
        if (this.invalid) return;

        // Force false if there is no way this RE is relevant to ABP
        if (!this.item.isOfType("physical") && this.type !== "item") {
            this.fromEquipment = false;
        }

        if (this.type === "ability") {
            if (this.ability) {
                this.slug = this.ability;
                this.label = CONFIG.PF2E.abilities[this.ability];
                // As a resolvable since ability modifiers aren't yet set for PCs
                this.value = `@actor.abilities.${source.ability}.mod`;
            }
        }

        this.critical =
            typeof source.critical === "boolean" && this.selectors.some((s) => s.includes("damage"))
                ? source.critical
                : null;

        if (this.force && this.type === "untyped") {
            this.failValidation("type: may not be undefined");
        }

        if (this.removeAfterRoll && !this.item.isOfType("effect")) {
            this.failValidation("removeAfterRoll: may only be used with effects");
        }
    }

    static override validateJoint(data: fields.SourceFromSchema<FlatModifierSchema>): void {
        super.validateJoint(data);
        if (data.selector.length === 0) {
            throw Error("selector: must have at least 1");
        }
        if (data.type === "ability" && !data.ability) {
            throw Error("ability: must be defined");
        }
        if (data.type !== "ability" && data.value === undefined) {
            throw Error("value: may not be undefined");
        }
    }

    static override defineSchema(): FlatModifierSchema {
        return {
            ...super.defineSchema(),
            selector: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, initial: undefined }),
                { required: true, initial: undefined },
            ),
            type: new fields.StringField({
                required: true,
                choices: Array.from(MODIFIER_TYPES),
                initial: "untyped",
            }),
            ability: new fields.StringField({ required: false, choices: CONFIG.PF2E.abilities, initial: undefined }),
            min: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
            max: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
            force: new fields.BooleanField(),
            hideIfDisabled: new fields.BooleanField(),
            fromEquipment: new fields.BooleanField({ required: true, nullable: false, initial: true }),
            damageType: new fields.StringField({ required: false, nullable: true, blank: false, initial: undefined }),
            damageCategory: new fields.StringField({
                required: false,
                blank: false,
                choices: damageCategoriesUnique,
                initial: undefined,
            }),
            critical: new fields.BooleanField({ required: false, nullable: true, initial: null }),
            value: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
            tags: new fields.ArrayField(new SlugField({ required: true, nullable: false, initial: undefined }), {
                required: false,
                nullable: false,
            }),
            removeAfterRoll: new DataUnionField(
                [
                    new StrictStringField<"if-enabled">({ required: false, nullable: false, choices: ["if-enabled"] }),
                    new StrictBooleanField({ required: false, nullable: false, initial: undefined }),
                    new PredicateField({ required: false, nullable: false, initial: undefined }),
                ],
                { required: false, nullable: false, initial: false },
            ),
            battleForm: new fields.BooleanField(),
        };
    }

    get selectors(): string[] {
        return this.selector;
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const label = this.getReducedLabel();
        const slug = this.slug ?? sluggify(label);

        const selectors = this.selectors.map((s) => this.resolveInjectedProperties(s)).filter((s) => !!s);

        for (const selector of selectors) {
            if (selector === "null") continue;

            const construct = (options: DeferredValueParams = {}): Modifier | null => {
                const resolvedValue = Number(this.resolveValue(this.value, 0, options)) || 0;
                if (this.ignored) return null;

                const finalValue = Math.clamp(resolvedValue, this.min ?? resolvedValue, this.max ?? resolvedValue);

                if (game.pf2e.variantRules.AutomaticBonusProgression.suppressRuleElement(this, finalValue)) {
                    return null;
                }

                // Allow a `damageType` resolved to an empty string be treated as `null`
                const damageType = this.damageType
                    ? this.resolveInjectedProperties(this.damageType, { warn: false }) || null
                    : null;
                if (damageType !== null && !objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
                    // If this rule element's predicate would have passed without there being a resolvable damage type,
                    // send out a warning.
                    if (this.test(options.test ?? [])) {
                        this.failValidation(`damageType: "${damageType}" is unrecognized`);
                    }
                    return null;
                }
                if (this.battleForm && !this.predicate.includes("battle-form")) this.predicate.push("battle-form");

                const modifier = new Modifier({
                    slug,
                    label,
                    modifier: finalValue,
                    type: this.type,
                    ability: this.type === "ability" ? this.ability : null,
                    predicate: this.resolveInjectedProperties(this.predicate),
                    rule: this,
                    force: this.force,
                    damageType,
                    damageCategory: this.damageCategory,
                    critical: this.critical,
                    tags: this.tags,
                    hideIfDisabled: this.hideIfDisabled,
                    source: this.item.uuid,
                });
                if (options.test) modifier.test(options.test);

                return modifier;
            };

            const modifiers = (this.actor.synthetics.modifiers[selector] ??= []);
            modifiers.push(construct);
        }
    }

    /** Remove this rule element's parent item after a roll */
    override async afterRoll({ check, rollOptions }: RuleElement.AfterRollParams): Promise<void> {
        if (this.ignored || !this.removeAfterRoll || !this.item.isOfType("effect")) {
            return;
        }

        const deleteItem =
            this.removeAfterRoll === true ||
            (this.removeAfterRoll === "if-enabled" && check.modifiers.some((m) => m.rule === this && m.enabled)) ||
            (Array.isArray(this.removeAfterRoll) && this.removeAfterRoll.test(rollOptions));
        if (deleteItem) await this.item.delete();
    }
}

interface FlatModifierRuleElement extends RuleElement<FlatModifierSchema>, ModelPropsFromRESchema<FlatModifierSchema> {
    value: RuleValue;
}

type FlatModifierSchema = RuleElementSchema & {
    /** All domains to add a modifier to */
    selector: fields.ArrayField<
        fields.StringField<string, string, true, false, false>,
        string[],
        string[],
        true,
        false,
        false
    >;
    /** The modifier (or bonus/penalty) type */
    type: fields.StringField<ModifierType, ModifierType, true, false, true>;
    /** If this is an ability modifier, the ability score it modifies */
    ability: fields.StringField<AttributeString, AttributeString, false, false, false>;
    /** Hide this modifier from breakdown tooltips if it is disabled */
    min: fields.NumberField<number, number, false, false, false>;
    max: fields.NumberField<number, number, false, false, false>;
    hideIfDisabled: fields.BooleanField;
    /** Whether to use this bonus/penalty/modifier even if it isn't the greatest magnitude */
    force: fields.BooleanField;
    /** Whether this modifier comes from equipment or an equipment effect */
    fromEquipment: fields.BooleanField;
    /** If a damage modifier, a damage type */
    damageType: fields.StringField<string, string, false, true, false>;
    /** If a damage modifier, a special category */
    damageCategory: fields.StringField<DamageCategoryUnique, DamageCategoryUnique, false, false, false>;
    /**
     * Control whether and how this modifier included in a roll depending on the result of the preceding check.
     * - `true`: the modifier is added only to critical damage rolls, without doubling.
     * - `false`: the modifier is added to both normal and critical damage rolls, without doubling.
     * - `null` (default): the modifier is added to both normal and critical damage rolls and is doubled in critical
     *   damage rolls.
     */
    critical: fields.BooleanField<boolean, boolean, false, true, true>;
    /** The numeric value of the modifier */
    value: ResolvableValueField<false, false, false>;
    /** A list of tags associated with this modifier */
    tags: fields.ArrayField<SlugField<true, false, false>, string[], string[], false, false, true>;
    /**
     * Remove the parent item (must be an effect) after a roll:
     * The value may be a boolean, "if-enabled", or a predicate to be tested against the roll options from the roll.
     */
    removeAfterRoll: DataUnionField<
        StrictStringField<"if-enabled"> | StrictBooleanField<false, false, false> | PredicateField<false, false, false>,
        false,
        false,
        true
    >;
    /** Whether this rule element is for use with battle forms */
    battleForm: fields.BooleanField;
};

interface FlatModifierSource extends RuleElementSource {
    selector?: JSONValue;
    min?: JSONValue;
    max?: JSONValue;
    type?: JSONValue;
    value?: JSONValue;
    ability?: JSONValue;
    force?: JSONValue;
    damageType?: JSONValue;
    damageCategory?: JSONValue;
    critical?: JSONValue;
    hideIfDisabled?: JSONValue;
}

export { FlatModifierRuleElement, type FlatModifierSource };
