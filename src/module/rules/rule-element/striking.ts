import type { ActorType } from "@actor/types.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { StrikingSynthetic } from "../synthetics.ts";
import { RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";

class StrikingRuleElement extends RuleElementPF2e<StrikingRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    static override defineSchema(): StrikingRuleSchema {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false }),
            value: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        const strikingValue = this.value ?? (this.item.isOfType("weapon") ? this.item.system.runes.striking : 0);
        const value = this.resolveValue(strikingValue);
        if (selector && typeof value === "number") {
            const striking: StrikingSynthetic = {
                label: this.getReducedLabel(),
                bonus: value,
                predicate: this.predicate,
            };
            const strikings = (this.actor.synthetics.striking[selector] ??= []);
            strikings.push(striking);
        } else {
            this.failValidation("Striking requires at least a selector field and a non-empty resolved value");
        }
    }
}

interface StrikingRuleElement extends RuleElementPF2e<StrikingRuleSchema>, ModelPropsFromRESchema<StrikingRuleSchema> {}

type StrikingRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    value: ResolvableValueField<false, false, false>;
};

export { StrikingRuleElement };
