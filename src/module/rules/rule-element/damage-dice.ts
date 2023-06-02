import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { DamageDiceOverride, DamageDicePF2e, DeferredValueParams } from "@actor/modifiers.ts";
import { ItemPF2e } from "@item";
import { CriticalInclusion, DamageDieSize } from "@system/damage/types.ts";
import { DAMAGE_DIE_FACES } from "@system/damage/values.ts";
import { isObject, objectHasKey, setHasElement, sluggify, tupleHasValue } from "@util";
import { BracketedValue, RuleElementSource } from "./data.ts";
import { RuleElementData, RuleElementPF2e } from "./index.ts";

class DamageDiceRuleElement extends RuleElementPF2e {
    override slug: string;

    selector: string;

    diceNumber: number | string = 0;

    dieSize: string | null = null;

    damageType: string | null = null;

    critical: CriticalInclusion;

    category: "persistent" | "precision" | "splash" | null;

    brackets: BracketedValue | null;

    override: DamageDiceOverride | null;

    constructor(data: DamageDiceSource, item: ItemPF2e<ActorPF2e>) {
        super(data, item);

        if (typeof data.selector === "string" && data.selector.length > 0) {
            this.selector = data.selector;
        } else {
            this.failValidation("Missing selector property");
            this.selector = "";
        }

        this.slug = sluggify(typeof data.slug === "string" && data.slug.length > 0 ? data.slug : this.item.name);

        // Dice number
        if (typeof data.diceNumber === "string" || typeof data.diceNumber === "number") {
            this.diceNumber = data.diceNumber;
        } else if ("diceNumber" in data) {
            this.failValidation("diceNumber must be a string, number, or omitted");
        }

        // Die faces
        if (typeof data.dieSize === "string" || data.dieSize === null) {
            this.dieSize = data.dieSize;
        } else if ("dieSize" in data) {
            this.failValidation("dieSize must be a string, null, or omitted");
        }

        // Damage type
        if (typeof data.damageType === "string") {
            this.damageType = data.damageType;
        } else if ("damageType" in data) {
            this.failValidation("damageType must be a string or omitted");
        }

        // Critical-only (or non-critical-only)
        this.critical = typeof data.critical === "boolean" ? data.critical : null;

        // Add precision damage
        const category = data.category ?? data.damageCategory ?? null;
        if (tupleHasValue(["persistent", "precision", "splash", null] as const, category)) {
            this.category = category;
        } else {
            this.failValidation('category must be "persistent", "precision", "splash", or omitted');
            this.category = null;
        }

        // Bracketed dieSize and diceNumber
        this.brackets = this.isBracketedValue(data.value) ? data.value : null;

        if (this.#isValidOverride(data.override)) {
            this.override = data.override ?? null;
        } else {
            this.failValidation(
                "The override property must be an object with one property of `upgrade` (boolean),",
                "`downgrade (boolean)`, `diceNumber` (integer between 0 and 10), `dieSize` (d6-d12), or `damageType`",
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
                slug: this.slug,
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
