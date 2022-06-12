import { CharacterPF2e, NPCPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { DamageDiceOverride, DamageDicePF2e } from "@actor/modifiers";
import { DamageDieSize, DamageType, DAMAGE_DIE_FACES, DAMAGE_TYPES } from "@system/damage";
import { isObject, setHasElement } from "@util";
import { RuleElementData, RuleElementPF2e } from "./";
import { RuleElementSource } from "./data";

/**
 * @category RuleElement
 */
export class DamageDiceRuleElement extends RuleElementPF2e {
    constructor(data: DamageDiceSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        if (typeof data.selector !== "string" || data.selector.length === 0) {
            this.failValidation("Missing selector property");
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        this.data.diceNumber = Number(this.resolveValue(this.data.diceNumber));
        const data = deepClone(this.data);
        if (this.data.value) {
            const bracketed = this.resolveValue(this.data.value);
            if (isObject(bracketed)) mergeObject(data, bracketed);
            delete data.value;
        }
        const selector = this.resolveInjectedProperties(data.selector);
        // In English (and in other languages when the same general form is used), labels patterned as
        // "Title: Subtitle (Parenthetical)" will be reduced to "Subtitle"
        // e.g., "Spell Effect: Ooze Form (Gelatinous Cube)" will become "Ooze Form"
        data.label = this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");
        data.slug = this.data.slug;

        data.damageType &&= this.resolveInjectedProperties(data.damageType);
        if (data.override) {
            data.override.damageType &&= this.resolveInjectedProperties(data.override.damageType) as DamageType;
            data.override.dieSize &&= this.resolveInjectedProperties(data.override.dieSize) as DamageDieSize;

            const isValidOverride = (override: unknown): override is DamageDiceOverride => {
                return (
                    isObject<DamageDiceOverride>(override) &&
                    ((typeof override.upgrade === "boolean" && !("downgrade" in override)) ||
                        (typeof override.downgrade === "boolean" && !("upgrade" in override)) ||
                        setHasElement(DAMAGE_DIE_FACES, override.dieSize) ||
                        setHasElement(DAMAGE_TYPES, override.damageType))
                );
            };

            if (!isValidOverride(data.override)) {
                this.failValidation(
                    "The override property must be an object with one property of `upgrade` (boolean),",
                    "`downgrade (boolean)`, `dieSize` (d6-d12), or `damageType` (recognized damage type)"
                );
                return;
            }
        }

        const dice = new DamageDicePF2e(data as Required<DamageDiceData>);
        const synthetics = (this.actor.synthetics.damageDice[selector] ??= []);
        synthetics.push(dice);
    }
}

export interface DamageDiceRuleElement {
    data: DamageDiceData;

    get actor(): CharacterPF2e | NPCPF2e;
}

interface DamageDiceData extends RuleElementData {
    slug?: string;
    name?: string;
    damageType?: string;
    override?: DamageDiceOverride;
    diceNumber?: number;
}

interface DamageDiceSource extends RuleElementSource {
    name?: unknown;
    damageType?: unknown;
    override?: unknown;
    diceNumber?: unknown;
}
