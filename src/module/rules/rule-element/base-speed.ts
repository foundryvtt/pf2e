import { CreaturePF2e } from "@actor";
import { MovementType } from "@actor/creature/data";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { tupleHasValue } from "@util";
import { BracketedValue, RuleElementOptions, RuleElementPF2e, RuleElementSource } from ".";
import { DeferredMovementType } from "../synthetics";

/**
 * @category RuleElement
 */
class BaseSpeedRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    static VALID_SELECTORS = ["burrow", "fly", "climb", "swim"] as const;

    private selector: BaseSpeedSelector = "fly";

    private value: number | string | BracketedValue = 0;

    constructor(data: BaseSpeedSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        const speedType = String(data.selector)
            .trim()
            .replace(/-speed$/, "");

        if (speedType === "land") {
            this.failValidation("A land speed may not be created");
        } else if (!tupleHasValue(BaseSpeedRuleElement.VALID_SELECTORS, speedType)) {
            this.failValidation("Unrecognized or missing selector");
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
        return () => {
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

type BaseSpeedSelector = Exclude<MovementType, "land">;

export { BaseSpeedRuleElement };
