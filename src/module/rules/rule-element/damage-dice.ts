import { DamageDiceOverride, DamageDicePF2e, DeferredValueParams } from "@actor/modifiers.ts";
import { DamageDieSize } from "@system/damage/types.ts";
import { DAMAGE_DIE_FACES } from "@system/damage/values.ts";
import { isObject, objectHasKey, setHasElement, sluggify } from "@util";
import { ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e } from "./index.ts";
import type { BooleanField, ObjectField, StringField } from "types/foundry/common/data/fields.d.ts";

class DamageDiceRuleElement extends RuleElementPF2e<DamageDiceRuleSchema> {
    static override defineSchema(): DamageDiceRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false }),
            diceNumber: new ResolvableValueField({ required: false, initial: undefined }),
            dieSize: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
            damageType: new fields.StringField({
                required: false,
                nullable: true,
                blank: false,
                initial: null,
            }),
            critical: new fields.BooleanField({ required: false, nullable: true, initial: undefined }),
            category: new fields.StringField({
                choices: ["persistent", "precision", "splash"],
                required: false,
                blank: false,
                initial: undefined,
            }),
            brackets: new ResolvableValueField({ required: false, nullable: true, initial: undefined }),
            override: new fields.ObjectField({ required: false, nullable: true, initial: undefined }),
        };
    }

    constructor(data: DamageDiceSource, options: RuleElementOptions) {
        super(data, options);

        this.brackets = this.isBracketedValue(data.value) ? data.value : null;

        if (data.override && !this.#isValidOverride(data.override)) {
            this.failValidation(
                "The override property must be an object with one property of 'upgrade' (boolean),",
                "'downgrade (boolean)', 'diceNumber' (integer between 0 and 10), 'dieSize' (d6-d12), or 'damageType'",
                "(recognized damage type)"
            );
            this.override = null;
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);

        const deferredDice = (params: DeferredValueParams = {}): DamageDicePF2e | null => {
            const label = this.getReducedLabel();
            const diceNumber = Number(this.resolveValue(this.diceNumber, 0, { resolvables: params.resolvables })) || 0;

            const resolvedBrackets = this.resolveValue(this.brackets, {}, { resolvables: params.resolvables });
            if (!this.#resolvedBracketsIsValid(resolvedBrackets)) {
                this.failValidation("Brackets failed to validate");
                return null;
            }

            const damageType = this.resolveInjectedProperties(this.damageType);
            if (damageType !== null && !objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
                this.failValidation(`Unrecognized damage type: ${damageType}`);
                return null;
            }

            if (this.override) {
                this.override.damageType &&= this.resolveInjectedProperties(this.override.damageType);
                if ("damageType" in this.override && !objectHasKey(CONFIG.PF2E.damageTypes, this.override.damageType)) {
                    this.failValidation("Unrecognized damage type in override");
                }

                this.override.dieSize &&= this.resolveInjectedProperties(this.override.dieSize);
                if ("dieSize" in this.override && !setHasElement(DAMAGE_DIE_FACES, this.override.dieSize)) {
                    this.failValidation("Unrecognized die size in override");
                }
            }

            const dieSize = this.resolveInjectedProperties(this.dieSize);
            if (dieSize !== null && !setHasElement(DAMAGE_DIE_FACES, dieSize)) {
                this.failValidation(`Die size must be a recognized damage die size, null, or omitted`);
                return null;
            }

            // If this failed validation partway through (such as in resolveInjectedProperties), return null
            if (this.ignored) return null;

            return new DamageDicePF2e({
                selector,
                slug: this.slug ?? sluggify(this.item.name),
                label,
                diceNumber,
                dieSize,
                critical: this.critical,
                category: this.category,
                damageType,
                predicate: this.predicate ?? {},
                override: deepClone(this.override),
                enabled: this.test(params.test ?? this.actor.getRollOptions(["damage"])),
                ...resolvedBrackets,
            });
        };

        const synthetics = (this.actor.synthetics.damageDice[selector] ??= []);
        synthetics.push(deferredDice);
    }

    #isValidOverride(override: unknown): override is DamageDiceOverride | undefined {
        if (override === undefined) return true;

        return (
            isObject<DamageDiceOverride>(override) &&
            ((typeof override.upgrade === "boolean" && !("downgrade" in override)) ||
                (typeof override.downgrade === "boolean" && !("upgrade" in override)) ||
                typeof override.damageType === "string" ||
                typeof override.dieSize === "string" ||
                (typeof override.diceNumber === "number" &&
                    Number.isInteger(override.diceNumber) &&
                    override.diceNumber >= 0 &&
                    override.diceNumber <= 10))
        );
    }

    #resolvedBracketsIsValid(value: unknown): value is ResolvedBrackets {
        if (!isObject<ResolvedBrackets>(value)) return false;
        const keysAreValid = Object.keys(value).every((k) => ["diceNumber", "dieSize", "override"].includes(k));
        const diceNumberIsValid = !("diceNumber" in value) || typeof value.diceNumber === "number";
        const dieSizeIsValid = !("dieSize" in value) || setHasElement(DAMAGE_DIE_FACES, value.dieSize);
        const overrideIsValid = !("override" in value) || this.#isValidOverride(value.override);
        return keysAreValid && diceNumberIsValid && dieSizeIsValid && overrideIsValid;
    }
}

interface ResolvedBrackets {
    dieSize?: DamageDieSize;
    diceNumber?: number;
    override?: DamageDiceOverride;
}

interface DamageDiceSource extends RuleElementSource {
    selector?: unknown;
    name?: unknown;
    diceNumber?: unknown;
    dieSize?: unknown;
    override?: unknown;
    damageType?: unknown;
    critical?: unknown;
    category?: unknown;
    damageCategory?: unknown;
}

interface DamageDiceRuleElement
    extends RuleElementPF2e<DamageDiceRuleSchema>,
        ModelPropsFromSchema<DamageDiceRuleSchema> {}

type DamageDiceRuleSchema = RuleElementSchema & {
    /** All domains to add a modifier to */
    selector: StringField<string, string, true, false, false>;
    /** The number of dice to add */
    diceNumber: ResolvableValueField<false, false, false>;
    /** The damage die size */
    dieSize: StringField<string, string, false, true, true>;
    /** The damage type */
    damageType: StringField<string, string, false, true, true>;
    /** True means the dice are added to critical without doubling; false means the dice are never added to
     *  critical damage; omitted means add to normal damage and double on critical damage.
     */
    critical: BooleanField<boolean, boolean, false, true, false>;
    /** The damage category */
    category: StringField<
        "persistent" | "precision" | "splash",
        "persistent" | "precision" | "splash",
        false,
        false,
        false
    >;
    /** Resolvable bracket data */
    brackets: ResolvableValueField<false, true, false>;
    /** Damage dice override data */
    override: ObjectField<DamageDiceOverride, DamageDiceOverride, false, true, false>;
};

export { DamageDiceRuleElement };
