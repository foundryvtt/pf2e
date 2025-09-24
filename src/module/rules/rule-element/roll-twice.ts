import { RollTwiceSynthetic } from "../synthetics.ts";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/** Roll Twice and keep either the higher or lower result */
class RollTwiceRuleElement extends RuleElement<RollTwiceRuleSchema> {
    static override defineSchema(): RollTwiceRuleSchema {
        return {
            ...super.defineSchema(),
            selector: new fields.ArrayField(new fields.StringField({ required: true, blank: false }), {
                required: true,
                nullable: false,
                min: 1,
            }),
            keep: new fields.StringField({ required: true, choices: ["lower", "higher"] }),
            removeAfterRoll: new fields.BooleanField({ required: false, initial: undefined }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const predicate = this.resolveInjectedProperties(this.predicate);
        for (const selector of this.resolveInjectedProperties(this.selector)) {
            const synthetic: RollTwiceSynthetic = { keep: this.keep, predicate };
            const synthetics = (this.actor.synthetics.rollTwice[selector] ??= []);
            synthetics.push(synthetic);
        }
    }

    override async afterRoll({ domains, roll, rollOptions }: RuleElement.AfterRollParams): Promise<void> {
        if (!this.actor.items.has(this.item.id)) {
            return;
        }

        const removeExpired = game.pf2e.settings.automation.removeEffects;
        const removeAfterRoll = this.removeAfterRoll ?? (removeExpired && this.item.isOfType("effect"));
        const rolledTwice = roll?.dice.some((d) => ["kh", "kl"].some((m) => d.modifiers.includes(m))) ?? false;
        if (
            !(
                rolledTwice &&
                removeAfterRoll &&
                this.selector.some((s) => domains.includes(s)) &&
                this.test(rollOptions)
            )
        ) {
            return;
        }

        for (const rule of this.item.rules) {
            rule.ignored = true;
        }

        if (removeExpired) await this.item.delete();
    }
}

interface RollTwiceRuleElement extends RuleElement<RollTwiceRuleSchema>, ModelPropsFromRESchema<RollTwiceRuleSchema> {}

type RollTwiceRuleSchema = RuleElementSchema & {
    selector: fields.ArrayField<
        fields.StringField<string, string, true, false, false>,
        string[],
        string[],
        true,
        false,
        true
    >;
    keep: fields.StringField<"higher" | "lower", "higher" | "lower", true, false, false>;
    /** If the hosting item is an effect, remove or expire it after a matching roll is made */
    removeAfterRoll: fields.BooleanField<boolean, boolean, false, false, false>;
};

export { RollTwiceRuleElement };
