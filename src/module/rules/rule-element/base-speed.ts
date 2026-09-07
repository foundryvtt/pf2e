import type { ActorType, CreaturePF2e } from "@actor";
import type { MovementType } from "@actor/types.ts";
import { MOVEMENT_TYPES } from "@actor/values.ts";
import { tupleHasValue } from "@util";
import type { BaseSpeedSynthetic, DeferredMovementType } from "../synthetics.ts";
import { RuleElement, RuleElementOptions } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

const SPEED_TYPE_PATTERN = /movement\.speeds\.(land|burrow|climb|fly|swim)/g;

function getSpeedFormulaDependsOn(formula: unknown, selfType: MovementType): MovementType[] {
    if (typeof formula !== "string") return [];
    const found = new Set<MovementType>();
    for (const match of formula.matchAll(SPEED_TYPE_PATTERN)) {
        const type = match[1];
        if (tupleHasValue(MOVEMENT_TYPES, type) && type !== selfType) found.add(type);
    }
    return [...found];
}

/**
 * @category RuleElement
 */
class BaseSpeedRuleElement extends RuleElement<BaseSpeedRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    static override autogenForms = true;

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super(data, options);
        if (this.invalid) return;

        this.selector = this.selector.trim().replace(/-speed$/, "");
        if (typeof this.value !== "string" && typeof this.value !== "number") {
            this.failValidation("A value must be a number or string");
        }
    }

    static override defineSchema(): BaseSpeedRuleSchema {
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false, initial: undefined }),
            value: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
            force: new fields.BooleanField({ required: false, nullable: false, initial: false }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;
        const speedType = this.resolveInjectedProperties(this.selector);
        if (!tupleHasValue(MOVEMENT_TYPES, speedType)) {
            return this.failValidation("Unrecognized or missing selector");
        }

        const synthetics = (this.actor.synthetics.movementTypes[speedType] ??= []);
        synthetics.push({
            dependsOn: getSpeedFormulaDependsOn(this.value, speedType),
            deferred: this.#createMovementType(speedType),
            test: (options = {}) => this.test(options.test ?? []),
        });
    }

    #createMovementType(type: MovementType): DeferredMovementType {
        const dependsOn = getSpeedFormulaDependsOn(this.value, type);
        return (options: { test?: string[] | Set<string> } = {}): BaseSpeedSynthetic | null => {
            if (!this.test(options.test ?? [])) return null;
            const value = Math.trunc(Number(this.resolveValue(this.value)));
            if (!(value > 0 || (this.force && value === 0))) {
                if (!Number.isInteger(value)) this.failValidation("Failed to resolve value");
                return null;
            }
            return {
                type,
                value,
                source: this.getReducedLabel(),
                force: this.force,
                formula: typeof this.value === "string" || typeof this.value === "number" ? this.value : value,
                dependsOn,
            };
        };
    }
}

interface BaseSpeedRuleElement extends RuleElement<BaseSpeedRuleSchema>, ModelPropsFromRESchema<BaseSpeedRuleSchema> {
    get actor(): CreaturePF2e;
}

type BaseSpeedRuleSchema = RuleElementSchema & {
    selector: fields.StringField<string, string, true, false, false>;
    value: ResolvableValueField<true, false, true>;
    force: fields.BooleanField<boolean, boolean, false, false, true>;
};

export { BaseSpeedRuleElement };
