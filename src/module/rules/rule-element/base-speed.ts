import { CreaturePF2e } from "@actor";
import { MovementType, UnlabeledSpeed } from "@actor/creature/data";
import { ActorType } from "@actor/data";
import { MOVEMENT_TYPES } from "@actor/values";
import { ItemPF2e } from "@item";
import { tupleHasValue } from "@util";
import { BracketedValue, RuleElementOptions, RuleElementPF2e, RuleElementSource } from ".";
import { DeferredMovementType } from "../synthetics";

/**
 * @category RuleElement
 */
class BaseSpeedRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    private selector: MovementType;

    private value: number | string | BracketedValue = 0;

    constructor(data: BaseSpeedSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        const speedType = String(data.selector)
            .trim()
            .replace(/-speed$/, "");

        if (!tupleHasValue(MOVEMENT_TYPES, speedType)) {
            this.failValidation("Unrecognized or missing selector");
            this.selector = "land";
        } else {
            this.selector = speedType;
        }

        if (typeof data.value === "string" || typeof data.value === "number" || this.isBracketedValue(data.value)) {
            this.value = data.value;
        } else {
            this.failValidation("A value must be a number, string, or bracketed value");
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;
        const speed = this.#createMovementType();
        const synthetics = (this.actor.synthetics.movementTypes[this.selector] ??= []);
        synthetics.push(speed);
    }

    #createMovementType(): DeferredMovementType {
        return (): UnlabeledSpeed | null => {
            if (!this.test()) return null;

            const value = this.resolveValue(this.value);
            if (!(typeof value === "number" && Number.isInteger(value))) {
                this.failValidation("Failed to resolve a value");
                return null;
            }

            return value > 0 ? { type: this.selector, value, source: this.item.name } : null;
        };
    }
}

interface BaseSpeedSource extends RuleElementSource {
    selector?: unknown;
}

interface BaseSpeedRuleElement extends RuleElementPF2e {
    get actor(): CreaturePF2e;
}

export { BaseSpeedRuleElement };
