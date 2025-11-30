import { DamageDiceOverride, DamageDicePF2e, DeferredDamageDiceOptions } from "@actor/modifiers.ts";
import { DAMAGE_DIE_SIZES } from "@system/damage/values.ts";
import { NullableBooleanField, SlugField } from "@system/schema-data-fields.ts";
import { objectHasKey, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import { extractDamageAlterations } from "../helpers.ts";
import { RuleElement, RuleElementOptions } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

class DamageDiceRuleElement extends RuleElement<DamageDiceRuleSchema> {
    constructor(data: DamageDiceSource, options: RuleElementOptions) {
        super(data, options);
        if (this.invalid) return;
        if (data.override && !this.#isValidOverride(data.override)) {
            this.failValidation(
                "The override property must be an object with one property of 'upgrade' (boolean),",
                "'downgrade (boolean)', 'diceNumber' (integer between 0 and 10), 'dieSize' (d6-d12), or 'damageType'",
                "(recognized damage type)",
            );
            this.override = null;
        }
    }

    static override defineSchema(): DamageDiceRuleSchema {
        return {
            ...super.defineSchema(),
            selector: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
            diceNumber: new ResolvableValueField({ required: true, nullable: true, initial: null }),
            dieSize: new fields.StringField({ required: true, blank: false, nullable: true, initial: null }),
            damageType: new fields.StringField({ required: true, nullable: true, blank: false, initial: null }),
            critical: new NullableBooleanField({ required: true, nullable: true, initial: null }),
            category: new fields.StringField({
                choices: ["persistent", "precision", "splash"],
                required: true,
                nullable: true,
                blank: false,
                initial: null,
            }),
            tags: new fields.ArrayField(new SlugField({ required: true, blank: false }), { required: true }),
            override: new fields.ObjectField({ required: false, nullable: true, initial: undefined }),
            hideIfDisabled: new fields.BooleanField(),
            battleForm: new fields.BooleanField(),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        for (const selector of this.resolveInjectedProperties(this.selector)) {
            if (selector === "null") continue;
            const { actor, parent } = this;

            const deferredDice = (options: DeferredDamageDiceOptions): DamageDicePF2e | null => {
                const label = this.getReducedLabel();

                // If this rule element's predicate would have passed without all fields being resolvable, send out a
                // warning.
                if (this.battleForm && !this.predicate.includes("battle-form")) this.predicate.push("battle-form");
                const testPassed =
                    this.predicate.length === 0 ||
                    this.resolveInjectedProperties(this.predicate).test([
                        ...(options.test ?? actor.getRollOptions(options.selectors)),
                        ...parent.getRollOptions("parent"),
                    ]);
                const resolveOptions = { ...options, warn: testPassed };

                const diceNumber = Number(this.resolveValue(this.diceNumber, 0, resolveOptions)) || 0;
                // Warning may have been suppressed, but return early if validation failed
                if (this.ignored) return null;

                const damageType = this.resolveInjectedProperties(this.damageType, resolveOptions);
                if (damageType !== null && !objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
                    if (testPassed) this.failValidation(`Unrecognized damage type: ${damageType}`);
                    return null;
                }

                if (this.override) {
                    const override = this.override;
                    override.damageType &&= this.resolveInjectedProperties(override.damageType, resolveOptions);
                    if ("damageType" in override && !objectHasKey(CONFIG.PF2E.damageTypes, override.damageType)) {
                        if (testPassed) this.failValidation("Unrecognized damage type in override");
                        return null;
                    }

                    override.diceNumber &&= Math.floor(
                        Number(this.resolveValue(override.diceNumber, NaN, resolveOptions)),
                    );
                    if (Number.isNaN(override.diceNumber)) return null;
                    if (typeof override.diceNumber === "number" && override.diceNumber < 0) {
                        if (testPassed) this.failValidation("A dice number must resolve to at least zero");
                        return null;
                    }

                    override.dieSize &&= this.resolveInjectedProperties(override.dieSize, resolveOptions);
                    if ("dieSize" in override && !tupleHasValue(DAMAGE_DIE_SIZES, override.dieSize)) {
                        if (testPassed) this.failValidation("Unrecognized die size in override");
                        return null;
                    }
                }

                const dieSize = this.resolveInjectedProperties(this.dieSize, resolveOptions);
                if (dieSize !== null && !tupleHasValue(DAMAGE_DIE_SIZES, dieSize)) {
                    if (testPassed) {
                        this.failValidation(`Die size must be a recognized damage die size, null, or omitted`);
                    }
                    return null;
                }

                const slug = this.slug ?? sluggify(parent.name);
                const alterationsRecord = actor.synthetics.damageAlterations;
                const alterations = extractDamageAlterations(alterationsRecord, options.selectors, slug);

                return new DamageDicePF2e({
                    selector,
                    slug,
                    label,
                    diceNumber,
                    dieSize,
                    critical: this.critical,
                    category: this.category,
                    damageType,
                    predicate: this.predicate,
                    tags: this.tags,
                    override: fu.deepClone(this.override),
                    enabled: testPassed,
                    hideIfDisabled: this.hideIfDisabled,
                    alterations,
                });
            };

            const synthetics = (actor.synthetics.damageDice[selector] ??= []);
            synthetics.push(deferredDice);
        }
    }

    #isValidOverride(override: unknown): override is DamageDiceOverride | undefined {
        if (override === undefined) return true;
        return (
            R.isPlainObject(override) &&
            ((typeof override.upgrade === "boolean" && !("downgrade" in override)) ||
                (typeof override.downgrade === "boolean" && !("upgrade" in override)) ||
                typeof override.damageType === "string" ||
                typeof override.dieSize === "string" ||
                typeof override.diceNumber === "string" ||
                (typeof override.diceNumber === "number" &&
                    Number.isInteger(override.diceNumber) &&
                    override.diceNumber >= 0 &&
                    override.diceNumber <= 256))
        );
    }
}

interface DamageDiceSource extends RuleElementSource {
    selector?: JSONValue;
    name?: JSONValue;
    diceNumber?: JSONValue;
    dieSize?: JSONValue;
    override?: JSONValue;
    damageType?: JSONValue;
    critical?: JSONValue;
    category?: JSONValue;
    damageCategory?: JSONValue;
    hideIfDisabled?: JSONValue;
}

interface DamageDiceRuleElement
    extends RuleElement<DamageDiceRuleSchema>,
        ModelPropsFromRESchema<DamageDiceRuleSchema> {}

type DamageDiceRuleSchema = RuleElementSchema & {
    /** All domains to add a modifier to */
    selector: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
    /** The number of dice to add */
    diceNumber: ResolvableValueField<true, true, true>;
    /** The damage die size */
    dieSize: fields.StringField<string, string, true, true, true>;
    /** The damage type */
    damageType: fields.StringField<string, string, true, true, true>;
    /**
     * Control whether and how these damage dice are included in a roll depending on the result of the preceding check.
     * - `true`: the dice are added only to critical damage rolls, without doubling.
     * - `false`: the dice are added to both normal and critical damage rolls, without doubling.
     * - `null` (default): the dice are added to both normal and critical damage rolls and are doubled in critical
     *   damage rolls.
     */
    critical: NullableBooleanField<true, true, true>;
    /** The damage category */
    category: fields.StringField<
        "persistent" | "precision" | "splash",
        "persistent" | "precision" | "splash",
        true,
        true,
        true
    >;
    /** A list of tags associated with this damage */
    tags: fields.ArrayField<SlugField<true, false, false>, string[], string[]>;
    /** Damage dice override data */
    override: fields.ObjectField<DamageDiceOverride, DamageDiceOverride, false, true, false>;
    /** Hide this dice change from breakdown tooltips if it is disabled */
    hideIfDisabled: fields.BooleanField<boolean, boolean, true, false, true>;
    /** Whether this rule element is for use with battle forms */
    battleForm: fields.BooleanField;
};

export { DamageDiceRuleElement };
export type { DamageDiceSource };
