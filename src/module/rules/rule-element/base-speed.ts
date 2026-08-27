import type { ActorType, CreaturePF2e } from "@actor";
import type { MovementType } from "@actor/types.ts";
import { MOVEMENT_TYPES } from "@actor/values.ts";
import { tupleHasValue } from "@util";
import type { BaseSpeedSynthetic, DeferredMovementType } from "../synthetics.ts";
import { RuleElement, RuleElementOptions } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

const SPEED_TYPE_PATTERN = /movement\.speeds\.(land|burrow|climb|fly|swim)/g;
const SPEED_VALUE_PATTERN = /movement\.speeds\.(land|burrow|climb|fly|swim)\.value/;

/**
 * How a BaseSpeed formula that reads another speed's total is built in prepareMovementData.
 *
 * - equal: Resolved number matches the parent speed's total (e.g. fly = land.value). Treat as the same
 *   speed: reuse the parent's base and modifier domains so shared bonuses apply once and stack normally.
 * - scaled: Formula uses parent.value but the result differs (e.g. land.value * 0.5). Parent modifiers are
 *   already in that number; only apply modifiers on this movement type's domain afterward.
 * - independent: Fixed value, reads .base only, or min/max chose a constant floor/cap. Build like a normal
 *   speed with full modifier domains (all-speeds, speed, type-speed).
 */
type SpeedDeriveKind = "equal" | "scaled" | "independent";

function getSpeedFormulaDependsOn(formula: unknown, selfType: MovementType): MovementType[] {
    if (typeof formula !== "string") return [];
    const found = new Set<MovementType>();
    for (const match of formula.matchAll(SPEED_TYPE_PATTERN)) {
        const type = match[1];
        if (tupleHasValue(MOVEMENT_TYPES, type) && type !== selfType) found.add(type);
    }
    return [...found];
}

function getDeriveParentType(formula: string | number, dependsOn: MovementType[]): MovementType | null {
    if (dependsOn.length === 0) return null;
    if (typeof formula === "string") {
        const fromValue = dependsOn.find((type) => formula.includes(`speeds.${type}.value`));
        if (fromValue) return fromValue;
    }
    return dependsOn[0] ?? null;
}

function classifySpeedDeriveKind(
    formula: string | number,
    resolved: number,
    parentValue: number | undefined,
): SpeedDeriveKind {
    if (typeof formula !== "string" || parentValue === undefined || !SPEED_VALUE_PATTERN.test(formula)) {
        return "independent";
    }
    if (resolved === parentValue) return "equal";
    if (/\b(?:min|max)\s*\(/i.test(formula)) {
        const literals = [...formula.matchAll(/(?<![.\w])(\d+)(?![.\w])/g)].map((m) => Number(m[1]));
        if (literals.includes(resolved)) return "independent";
    }
    return "scaled";
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
        });
    }

    #createMovementType(type: MovementType): DeferredMovementType {
        const dependsOn = getSpeedFormulaDependsOn(this.value, type);
        return (options: { test?: string[] | Set<string> } = {}): BaseSpeedSynthetic | null => {
            if (!this.test(options.test ?? [])) return null;
            const value = Math.trunc(Number(this.resolveValue(this.value)));
            if (!(value > 0)) {
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

export { BaseSpeedRuleElement, classifySpeedDeriveKind, getDeriveParentType };
