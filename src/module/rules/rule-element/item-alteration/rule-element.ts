import { ItemType } from "@item/data/index.ts";
import * as R from "remeda";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementPF2e, RuleElementSchema } from "../index.ts";
import { ItemAlteration, ItemAlterationSchema } from "./alteration.ts";

class ItemAlterationRuleElement extends RuleElementPF2e<ItemAlterationRuleSchema> {
    static override defineSchema(): ItemAlterationRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            itemType: new fields.StringField({
                required: true,
                nullable: false,
                choices: R.mapValues(CONFIG.PF2E.Item.documentClasses, (key) => `TYPES.Item.${key}`),
                initial: undefined,
            }),
            ...ItemAlteration.defineSchema(),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const actorRollOptions = this.predicate.length > 0 ? this.actor.getRollOptions() : [];
        try {
            for (const item of this.actor.itemTypes[this.itemType]) {
                const itemRollOptions = this.predicate.length > 0 ? item.getRollOptions("item") : [];
                const rollOptions = [...actorRollOptions, ...itemRollOptions];
                if (this.test(rollOptions)) {
                    const alteration = new ItemAlteration(R.pick(this, ["mode", "property", "value"]), {
                        parent: this,
                    });
                    return alteration.applyTo(item);
                }
            }
        } catch (error) {
            if (error instanceof Error) this.failValidation(error.message);
        }
    }
}

interface ItemAlterationRuleElement
    extends RuleElementPF2e<ItemAlterationRuleSchema>,
        ModelPropsFromSchema<ItemAlterationRuleSchema> {}

type ItemAlterationRuleSchema = RuleElementSchema &
    ItemAlterationSchema & {
        itemType: StringField<ItemType, ItemType, true, false, false>;
    };

export { ItemAlterationRuleElement };
