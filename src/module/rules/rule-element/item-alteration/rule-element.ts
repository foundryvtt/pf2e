import type { ActorPF2e } from "@actor";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import { ItemType } from "@item/data/index.ts";
import * as R from "remeda";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeRuleElement } from "../ae-like.ts";
import { RuleElementPF2e, RuleElementSchema } from "../index.ts";
import { ItemAlteration, ItemAlterationSchema } from "./alteration.ts";

class ItemAlterationRuleElement extends RuleElementPF2e<ItemAlterationRuleSchema> {
    static override defineSchema(): ItemAlterationRuleSchema {
        const { fields } = foundry.data;

        const baseSchema = super.defineSchema();
        const PRIORITIES: Record<string, number | undefined> = AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES;
        baseSchema.priority.initial = (d) => PRIORITIES[String(d.mode)] ?? 50;

        return {
            ...baseSchema,
            itemId: new fields.StringField({
                required: false,
                nullable: false,
                blank: false,
                initial: undefined,
            }),
            itemType: new fields.StringField({
                required: false,
                nullable: false,
                choices: R.mapValues(CONFIG.PF2E.Item.documentClasses, (key) => `TYPES.Item.${key}`),
                initial: undefined,
            }),
            ...ItemAlteration.defineSchema(),
        };
    }

    static override validateJoint(data: SourceFromSchema<ItemAlterationRuleSchema>): void {
        super.validateJoint(data);

        if (!data.itemId && !data.itemType) {
            throw Error("one of itemId and itemType must be defined");
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const actorRollOptions = this.predicate.length > 0 ? this.actor.getRollOptions() : [];
        try {
            const items = this.itemId
                ? R.compact([this.actor.items.get(this.resolveInjectedProperties(this.itemId))])
                : this.itemType === "condition"
                ? this.actor.conditions
                : this.actor.itemTypes[this.itemType!];
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

        const itemsOfType: ItemPF2e<ActorPF2e>[] = this.itemType ? this.actor.itemTypes[this.itemType] : [];
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
        /** The type of items to alter */
        itemType: StringField<ItemType, ItemType, false, false, false>;
        /** As an alternative to specifying item types, an exact item ID can be provided */
        itemId: StringField<string, string, false, false, false>;
    };

export { ItemAlterationRuleElement };
