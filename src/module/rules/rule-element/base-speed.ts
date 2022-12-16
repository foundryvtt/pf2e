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

    private selector: string;

    private value: number | string | BracketedValue = 0;

    constructor(data: BaseSpeedSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.selector = String(data.selector)
            .trim()
            .replace(/-speed$/, "");

        if (typeof data.value === "string" || typeof data.value === "number" || this.isBracketedValue(data.value)) {
            this.value = data.value;
        } else {
            this.failValidation("A value must be a number, string, or bracketed value");
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;
        const speedType = this.resolveInjectedProperties(this.selector);
        if (!tupleHasValue(MOVEMENT_TYPES, speedType)) {
            return this.failValidation("Unrecognized or missing selector");
        }

        const speed = this.#createMovementType(speedType);
        const synthetics = (this.actor.synthetics.movementTypes[speedType] ??= []);
        synthetics.push(speed);
    }

    #createMovementType(type: MovementType): DeferredMovementType {
        return (): UnlabeledSpeed | null => {
            if (!this.test()) return null;

            const value = Math.trunc(Number(this.resolveValue(this.value)));
            if (!Number.isInteger(value)) {
                this.failValidation("Failed to resolve value");
                return null;
            }

            return value > 0 ? { type: type, value, source: this.item.name } : null;
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
