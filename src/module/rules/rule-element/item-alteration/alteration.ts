import type { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { AELikeChangeMode } from "../ae-like.ts";
import type { RuleElementPF2e } from "../base.ts";
import { ResolvableValueField } from "../data.ts";
import { ITEM_ALTERATION_HANDLERS } from "./handlers.ts";
import fields = foundry.data.fields;

class ItemAlteration extends foundry.abstract.DataModel<RuleElementPF2e, ItemAlterationSchema> {
    static override defineSchema(): ItemAlterationSchema {
        return {
            mode: new fields.StringField({
                required: true,
                choices: ["add", "downgrade", "multiply", "override", "remove", "subtract", "upgrade"],
                initial: undefined,
            }),
            property: new fields.StringField({
                required: true,
                initial: undefined,
                choices: R.keys(ITEM_ALTERATION_HANDLERS),
            }),
            fromEquipment: new fields.BooleanField({
                required: true,
                nullable: false,
                initial: true,
            }),
            value: new ResolvableValueField(),
        };
    }

    get rule(): RuleElementPF2e {
        return this.parent;
    }

    get actor(): ActorPF2e {
        return this.parent.actor;
    }

    /**
     * Apply this alteration to an item (or source)
     * @param item The item to be altered
     */
    applyTo(item: ItemPF2e<ActorPF2e> | ItemSourcePF2e): void {
        const handler = ITEM_ALTERATION_HANDLERS[this.property];
        const fallbackValue = handler.fields.value.getInitialValue();
        if (this.parent.ignored) return;

        handler.handle({
            item,
            rule: this.rule,
            fromEquipment: this.fromEquipment,
            alteration: {
                mode: this.mode,
                itemType: item.type,
                value: (this.value = this.parent.resolveValue(this.value, fallbackValue)),
            },
        });
    }
}

interface ItemAlteration
    extends foundry.abstract.DataModel<RuleElementPF2e, ItemAlterationSchema>,
        fields.ModelPropsFromSchema<ItemAlterationSchema> {}

type ItemAlterationSchema = {
    mode: fields.StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    property: fields.StringField<ItemAlterationProperty, ItemAlterationProperty, true, false, false>;
    value: ResolvableValueField<true, true, false>;
    /** Whether this alteration comes from equipment or an equipment effect */
    fromEquipment: fields.BooleanField;
};

type ItemAlterationProperty = keyof typeof ITEM_ALTERATION_HANDLERS;

export { ItemAlteration };
export type { ItemAlterationProperty, ItemAlterationSchema };
