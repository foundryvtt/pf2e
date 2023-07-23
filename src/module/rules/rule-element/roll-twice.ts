import { RollTwiceSynthetic } from "../synthetics.ts";
import { RuleElementPF2e } from "./base.ts";
import { RuleElementSchema } from "./index.ts";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";

/** Roll Twice and keep either the higher or lower result */
class RollTwiceRuleElement extends RuleElementPF2e<RollTwiceRuleSchema> {
    static override defineSchema(): RollTwiceRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false }),
            keep: new fields.StringField({ required: true, choices: ["lower", "higher"] }),
            removeAfterRoll: new fields.BooleanField({ required: false, initial: undefined }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const synthetic: RollTwiceSynthetic = { keep: this.keep };
        if (this.predicate) synthetic.predicate = this.predicate;

        const synthetics = (this.actor.synthetics.rollTwice[this.selector] ??= []);
        synthetics.push(synthetic);
    }

    override async afterRoll({ selectors, roll, rollOptions }: RuleElementPF2e.AfterRollParams): Promise<void> {
        if (!this.actor.items.has(this.item.id)) {
            return;
        }

        const expireEffects = game.settings.get("pf2e", "automation.effectExpiration");
        const removeExpired = game.settings.get("pf2e", "automation.removeExpiredEffects");
        const removeAfterRoll =
            this.removeAfterRoll ?? ((expireEffects || removeExpired) && this.item.isOfType("effect"));

        const rolledTwice = roll?.dice.some((d) => ["kh", "kl"].some((m) => d.modifiers.includes(m))) ?? false;
        if (!(rolledTwice && removeAfterRoll && selectors.includes(this.selector) && this.test(rollOptions))) {
            return;
        }

        for (const rule of this.item.rules) {
            rule.ignored = true;
        }

        if (removeExpired) {
            await this.item.delete();
        } else if (expireEffects) {
            await this.item.update({ "system.duration.value": -1, "system.expired": true });
        }
    }
}

interface RollTwiceRuleElement
    extends RuleElementPF2e<RollTwiceRuleSchema>,
        ModelPropsFromSchema<RollTwiceRuleSchema> {}

type RollTwiceRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    keep: StringField<"higher" | "lower", "higher" | "lower", true, false, false>;
    /** If the hosting item is an effect, remove or expire it after a matching roll is made */
    removeAfterRoll: BooleanField<boolean, boolean, false, false, false>;
};

export { RollTwiceRuleElement };
