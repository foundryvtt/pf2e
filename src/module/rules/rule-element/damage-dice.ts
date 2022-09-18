import { CharacterPF2e, NPCPF2e } from "@actor";
import { DamageDiceOverride, DamageDicePF2e, DeferredValueParams } from "@actor/modifiers";
import { ItemPF2e } from "@item";
import { DamageDieSize } from "@system/damage/types";
import { DAMAGE_DIE_FACES, DAMAGE_TYPES } from "@system/damage/values";
import { isObject, setHasElement, sluggify } from "@util";
import { RuleElementData, RuleElementPF2e } from "./";
import { BracketedValue, RuleElementSource } from "./data";

class DamageDiceRuleElement extends RuleElementPF2e {
    override slug: string;

    selector: string;

    diceNumber: number | string;

    dieSize: DamageDieSize | null;

    damageType: string | null;

    precision: boolean;

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

        // Add precision damage
        const category = data.category ?? data.damageCategory;
        this.precision = category === "precision";
        if (category && category !== "precision") {
            this.failValidation('category must be "precision" or omitted');
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

            const resolvedBrackets = this.resolveValue(this.brackets) ?? {};
            if (!this.#resolvedBracketsIsValid(resolvedBrackets)) {
                this.failValidation("Brackets failed to validate");
                return null;
            }

            const damageType = this.resolveInjectedProperties(this.damageType);

            if (this.override) {
                this.override.damageType &&= this.resolveInjectedProperties(this.override.damageType);
                this.override.dieSize &&= this.resolveInjectedProperties(this.override.dieSize);
            }

            return new DamageDicePF2e({
                selector,
                slug: this.slug,
                label,
                dieSize: this.dieSize,
                diceNumber,
                category: this.precision ? "precision" : null,
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
                setHasElement(DAMAGE_DIE_FACES, override.dieSize) ||
                setHasElement(DAMAGE_TYPES, override.damageType) ||
                (typeof override.diceNumber === "number" &&
                    Number.isInteger(override.diceNumber) &&
                    override.diceNumber > 0 &&
                    override.diceNumber <= 10))
        );
    }

    #resolvedBracketsIsValid(value: unknown): value is ResolvedBrackets {
        if (!isObject<ResolvedBrackets>(value)) return false;
        const keysAreValid = Object.keys(value).every((k) => ["diceNumber", "dieSize"].includes(k));
        const diceNumberIsValid = !("diceNumber" in value) || typeof value.diceNumber === "number";
        const dieSizeIsValid = !("dieSize" in value) || setHasElement(DAMAGE_DIE_FACES, value.dieSize);
        return keysAreValid && diceNumberIsValid && dieSizeIsValid;
    }
}

interface ResolvedBrackets {
    dieSize?: DamageDieSize;
    diceNumber?: number;
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
    category?: unknown;
    damageCategory?: unknown;
}

export { DamageDiceRuleElement };
