import { ItemType } from "@item/data/index.ts";
import { objectHasKey } from "@util";
import * as R from "remeda";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeRuleElement } from "../ae-like.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "../index.ts";
import { ItemAlteration, ItemAlterationSchema } from "./alteration.ts";
import { ActorPF2e } from "@actor";
import { ItemPF2e, PhysicalItemPF2e } from "@item";

class ItemAlterationRuleElement extends RuleElementPF2e<ItemAlterationRuleSchema> {
    constructor(source: RuleElementSource, options: RuleElementOptions) {
        if ("mode" in source && objectHasKey(AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES, source.mode)) {
            source.priority ??= AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES[source.mode];
        }
        super(source, options);
    }

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
            const items = this.itemType === "condition" ? this.actor.conditions : this.actor.itemTypes[this.itemType];
            for (const item of items) {
                const itemRollOptions = this.predicate.length > 0 ? item.getRollOptions("item") : [];
                const rollOptions = [...actorRollOptions, ...itemRollOptions];
                if (this.test(rollOptions)) {
                    const data = R.pick(this, ["mode", "property", "value"]);
                    const alteration = new ItemAlteration(data, { parent: this });
                    alteration.applyTo(item);
                }
            }
        } catch (error) {
            if (error instanceof Error) this.failValidation(error.message);
        }
    }

    /** If this RE alters max HP, proportionally adjust current HP of items it would match against */
    override async preCreate(): Promise<void> {
        if (this.ignored || this.property !== "hp-max") return;

        const itemsOfType: ItemPF2e<ActorPF2e>[] = this.actor.itemTypes[this.itemType];
        const actorRollOptions = this.actor.getRollOptions();
        const itemsToAlter = itemsOfType.filter((i): i is PhysicalItemPF2e<ActorPF2e> =>
            this.test([...actorRollOptions, ...i.getRollOptions("item")])
        );
        const updates = itemsToAlter.flatMap((item): { _id: string; "system.hp.value": number } | never[] => {
            const source = item.toObject();
            const alteration = new ItemAlteration(R.pick(this, ["mode", "property", "value"]), { parent: this });
            alteration.applyTo(source);
            alteration.applyTo(item);
            const newHP = source.system.hp;
            const oldHP = item._source.system.hp;
            const newHPValue = Math.floor(oldHP.value * (newHP.max / oldHP.max));
            return newHPValue === oldHP.value ? [] : { _id: item.id, "system.hp.value": newHPValue };
        });
        if (updates.length > 0) await this.actor.updateEmbeddedDocuments("Item", updates, { render: false });
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
