import { CreaturePF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { MovementType } from "@actor/types.ts";
import { MOVEMENT_TYPES } from "@actor/values.ts";
import { tupleHasValue } from "@util";
import { BaseSpeedSynthetic, DeferredMovementType } from "../synthetics.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";

/**
 * @category RuleElement
 */
class BaseSpeedRuleElement extends RuleElementPF2e<BaseSpeedRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    static override defineSchema(): BaseSpeedRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, nullable: false, blank: false }),
            value: new ResolvableValueField({ required: true, nullable: false }),
        };
    }

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super(data, options);

        this.selector = this.selector.trim().replace(/-speed$/, "");

        if (!(typeof this.value === "string" || typeof this.value === "number" || this.isBracketedValue(this.value))) {
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
        return (): BaseSpeedSynthetic | null => {
            if (!this.test()) return null;

            const value = Math.trunc(Number(this.resolveValue(this.value)));
            if (!Number.isInteger(value)) {
                this.failValidation("Failed to resolve value");
                return null;
            }
            // Whether this speed is derived from the creature's land speed
            const derivedFromLand =
                type !== "land" &&
                typeof this.value === "string" &&
                /attributes\.speed\.(?:value|total)/.test(this.value);

            return value > 0 ? { type: type, value, source: this.item.name, derivedFromLand } : null;
        };
    }
}

interface BaseSpeedRuleElement extends RuleElementPF2e<BaseSpeedRuleSchema>, ModelPropsFromSchema<BaseSpeedRuleSchema> {
    get actor(): CreaturePF2e;
}

type BaseSpeedRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    value: ResolvableValueField<true, false, true>;
};

export { BaseSpeedRuleElement };
