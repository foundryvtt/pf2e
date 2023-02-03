import { ActorType } from "@actor/data";
import { ModifierAdjustment } from "@actor/modifiers";
import { ItemPF2e } from "@item";
import { DamageType } from "@system/damage/types";
import { DAMAGE_TYPES } from "@system/damage/values";
import { isObject, setHasElement } from "@util";
import { ArrayField, BooleanField, ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";
import { RuleElementOptions } from "./";
import { AELikeData, AELikeRuleElement, AELikeSchema, AELikeSource } from "./ae-like";

const { fields } = foundry.data;

/** Adjust the value of a modifier, change its damage type (in case of damage modifiers) or suppress it entirely */
class AdjustModifierRuleElement extends AELikeRuleElement<AdjustModifierSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    static override defineSchema(): AdjustModifierSchema {
        return {
            ...super.defineSchema(),
            // `path` isn't used for AdjustModifier REs
            path: new fields.StringField({ required: false, blank: true, initial: undefined }),
            selector: new fields.StringField({ required: false, blank: false, initial: undefined }),
            selectors: new fields.ArrayField(new fields.StringField({ required: true, blank: false }), {
                required: false,
                nullable: false,
                initial: [],
            }),
            relabel: new fields.StringField({ required: false, blank: false, initial: undefined }),
            damageType: new fields.StringField({ required: false, blank: false, initial: undefined }),
            suppress: new fields.BooleanField({ required: true, initial: false }),
        };
    }

    constructor(data: AdjustModifierSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data.path = "ignore"; // Maybe this shouldn't subclass AELikeRuleElement

        if (data.suppress) {
            data.mode = "override";
            data.value = 0;
            data.priority ??= 99; // Try to apply last
        }

        super({ ...data, phase: "beforeDerived" }, item, options);

        if (typeof data.selector === "string" && this.selectors.length === 0) {
            this.selectors = [data.selector];
        }

        this.suppress = !!data.suppress;
    }

    protected override validateData(): void {
        if (this.ignored) return;

        const tests = {
            value: ["string", "number"].includes(typeof this.value) || isObject(this.value),
        };

        for (const [key, result] of Object.entries(tests)) {
            if (!result) this.warn(key);
        }
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override applyAELike(): void {
        this.validateData();
        if (this.ignored) return;

        const adjustment: ModifierAdjustment = {
            slug: this.slug,
            predicate: this.predicate,
            suppress: this.suppress,
            getNewValue: (current: number): number => {
                const change = this.resolveValue();
                if (typeof change !== "number") {
                    this.failValidation("value does not resolve to a number");
                    return current;
                }

                return this.getNewValue(current, change);
            },
            getDamageType: (current: DamageType | null): DamageType | null => {
                if (!this.damageType) return current;

                const damageType = this.resolveInjectedProperties(this.damageType);
                if (!setHasElement(DAMAGE_TYPES, damageType)) {
                    this.failValidation(`${damageType} is an unrecognized damage type.`);
                    return current;
                }

                return damageType;
            },
        };

        if (this.relabel) {
            adjustment.relabel = this.resolveInjectedProperties(this.relabel).replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");
        }

        for (const selector of this.selectors.map((s) => this.resolveInjectedProperties(s))) {
            const adjustments = (this.actor.synthetics.modifierAdjustments[selector] ??= []);
            adjustments.push(adjustment);
        }
    }
}

interface AdjustModifierRuleElement
    extends AELikeRuleElement<AdjustModifierSchema>,
        ModelPropsFromSchema<AdjustModifierSchema> {
    data: AELikeData;
}

type AdjustModifierSchema = AELikeSchema & {
    /** An optional relabeling of the adjusted modifier */
    relabel: StringField;
    selector: StringField;
    selectors: ArrayField<StringField>;
    damageType: StringField;
    suppress: BooleanField;
};

interface AdjustModifierSource extends Exclude<AELikeSource, "path"> {
    selector?: unknown;
    selectors?: unknown;
    relabel?: unknown;
    damageType?: unknown;
    suppress?: unknown;
}

export { AdjustModifierRuleElement };
