import { ActorType } from "@actor/data/index.ts";
import { WeaponPF2e } from "@item";
import { getStrikingDice } from "@item/physical/runes.ts";
import { StrikingSynthetic } from "../synthetics.ts";
import { RuleElementPF2e, RuleElementSchema } from "./index.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";

class StrikingRuleElement extends RuleElementPF2e<StrikingRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    static override defineSchema(): StrikingRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false }),
            value: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        const strikingValue = this.value ?? (this.item instanceof WeaponPF2e ? getStrikingDice(this.item.system) : 0);
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

interface StrikingRuleElement extends RuleElementPF2e<StrikingRuleSchema>, ModelPropsFromSchema<StrikingRuleSchema> {}

type StrikingRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    value: ResolvableValueField<false, false, false>;
};

export { StrikingRuleElement };
