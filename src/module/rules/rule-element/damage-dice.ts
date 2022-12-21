import { CharacterPF2e, NPCPF2e } from "@actor";
import { DamageDiceOverride, DamageDicePF2e, DeferredValueParams } from "@actor/modifiers";
import { ItemPF2e } from "@item";
import { DamageDieSize } from "@system/damage/types";
import { DAMAGE_DIE_FACES, DAMAGE_TYPES } from "@system/damage/values";
import { isObject, setHasElement, sluggify, tupleHasValue } from "@util";
import { RuleElementData, RuleElementPF2e } from "./";
import { BracketedValue, RuleElementSource } from "./data";

class DamageDiceRuleElement extends RuleElementPF2e {
    override slug: string;

    selector: string;

    diceNumber: number | string;

    dieSize: DamageDieSize | null;

    damageType: string | null;

    critical: boolean | null;

    category: "precision" | "persistent" | null;

    brackets: BracketedValue | null;

    override: DamageDiceOverride | null;

    constructor(data: DamageDiceSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        if (typeof data.selector === "string" && data.selector.length > 0) {
            this.selector = data.selector;
        } else {
            this.failValidation("Missing selector property");
            this.selector = "";
        }

        this.slug = sluggify(typeof data.slug === "string" && data.slug.length > 0 ? data.slug : this.item.name);

        // Number of dice
        if (typeof data.diceNumber === "string" || typeof data.diceNumber === "number") {
            this.diceNumber = data.diceNumber;
        } else if ("diceNumber" in data) {
            this.failValidation("diceNumber must be a string, number, or omitted");
        }
        this.diceNumber ??= 0;

        // Die faces
        if (setHasElement(DAMAGE_DIE_FACES, data.dieSize)) {
            this.dieSize = data.dieSize;
        } else if ("dieSize" in data) {
            this.failValidation("dieSize must be a string or omitted");
        }
        this.dieSize ??= null;

        // Damage type
        if (typeof data.damageType === "string") {
            this.damageType = data.damageType;
        } else if ("damageType" in data) {
            this.failValidation("damageType must be a string or omitted");
        }
        this.damageType ??= null;

        // Critical-only (or non-critical-only)
        this.critical = typeof data.critical === "boolean" ? data.critical : null;

        // Add precision damage
        const category = data.category ?? data.damageCategory ?? null;
        if (tupleHasValue(["persistent", "precision", null] as const, category)) {
            this.category = category;
        } else {
            this.failValidation('category must be "precision", "persistent", or omitted');
            this.category = null;
        }

        // Bracketed dieSize and diceNumber
        this.brackets = this.isBracketedValue(data.value) ? data.value : null;

        if (this.#isValidOverride(data.override)) {
            this.override = data.override ?? null;
        } else {
            this.failValidation(
                "The override property must be an object with one property of `upgrade` (boolean),",
                "`downgrade (boolean)`, `dieSize` (d6-d12), or `damageType` (recognized damage type)"
            );
            this.override = null;
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);

        const deferredDice = (params: DeferredValueParams = {}): DamageDicePF2e | null => {
            if (!this.test(params.test ?? this.actor.getRollOptions(["damage"]))) return null;

            // In English (and in other languages when the same general form is used), labels patterned as
            // "Title: Subtitle (Parenthetical)" will be reduced to "Subtitle"
            // e.g., "Spell Effect: Ooze Form (Gelatinous Cube)" will become "Ooze Form"
            const label = this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");

            const diceNumber =
                typeof this.diceNumber === "string" ? Number(this.resolveValue(this.diceNumber)) || 0 : this.diceNumber;

            const resolvedBrackets = this.resolveValue(this.brackets, {});
            if (!this.#resolvedBracketsIsValid(resolvedBrackets)) {
                this.failValidation("Brackets failed to validate");
                return null;
            }

            const damageType = this.resolveInjectedProperties(this.damageType);
            if (damageType !== null && !setHasElement(DAMAGE_TYPES, damageType)) {
                this.failValidation(`Unrecognized damage type: ${damageType}`);
                return null;
            }

            if (this.override) {
                this.override.damageType &&= this.resolveInjectedProperties(this.override.damageType);
                if ("damageType" in this.override && !setHasElement(DAMAGE_TYPES, this.override.damageType)) {
                    this.failValidation("Unrecognized damage type in override");
                }

                this.override.dieSize &&= this.resolveInjectedProperties(this.override.dieSize);
                if ("dieSize" in this.override && !setHasElement(DAMAGE_DIE_FACES, this.override.dieSize)) {
                    this.failValidation("Unrecognized die size in override");
                }
            }

            // If this failed validation partway through (such as in resolveInjectedProperties), return null
            if (this.ignored) return null;

            return new DamageDicePF2e({
                selector,
                slug: this.slug,
                label,
                dieSize: this.dieSize,
                diceNumber,
                critical: this.critical,
                category: this.category,
                damageType,
                predicate: this.predicate ?? {},
                override: deepClone(this.override),
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
                    override.diceNumber > 0 &&
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

interface DamageDiceRuleElement {
    data: DamageDiceData;

    get actor(): CharacterPF2e | NPCPF2e;
}

interface DamageDiceData extends RuleElementData {
    name?: string;
    damageType?: string;
    override?: DamageDiceOverride;
    diceNumber?: number;
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

export { DamageDiceRuleElement };
