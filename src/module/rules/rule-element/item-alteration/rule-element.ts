import type { ActorPF2e } from "@actor";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import { ItemType } from "@item/base/data/index.ts";
import * as R from "remeda";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeRuleElement } from "../ae-like.ts";
import { RuleElementPF2e, RuleElementSchema } from "../index.ts";
import { ItemAlteration, ItemAlterationSchema } from "./alteration.ts";

class ItemAlterationRuleElement extends RuleElementPF2e<ItemAlterationRuleSchema> {
    static override defineSchema(): ItemAlterationRuleSchema {
        const { fields } = foundry.data;

        // Set a default priority according to AE mode yet still later than AE-likes
        const baseSchema = super.defineSchema();
        const PRIORITIES: Record<string, number | undefined> = AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES;
        baseSchema.priority.initial = (d) => (PRIORITIES[String(d.mode)] ?? 50) + 100;

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

    override onApplyActiveEffects(): void {
        this.#applyAlteration();
    }

    override async preCreate({ tempItems }: RuleElementPF2e.PreCreateParams): Promise<void> {
        if (this.ignored) return;

        // Apply feature/feature alterations during pre-creation to possibly inform subsequent REs like choice sets
        if (this.itemType === "feat") {
            this.#applyAlteration(tempItems);
        }

        // If this RE alters max HP, proportionally adjust current HP of items it would match against
        if (this.property !== "hp-max") return;

        const itemsOfType: ItemPF2e<ActorPF2e>[] = this.itemType ? this.actor.itemTypes[this.itemType] : [];
        const actorRollOptions = this.actor.getRollOptions();
        const predicate = this.resolveInjectedProperties(this.predicate);
        const itemsToAlter = itemsOfType.filter((i): i is PhysicalItemPF2e<ActorPF2e> =>
            predicate.test([...actorRollOptions, ...i.getRollOptions("item")]),
        );
        const updates = itemsToAlter.flatMap((item): { _id: string; "system.hp.value": number } | never[] => {
            const source = item.toObject();
            const alteration = new ItemAlteration(R.pick(this, ["mode", "property", "value"] as const), {
                parent: this,
            });
            alteration.applyTo(source);
            alteration.applyTo(item);
            const newHP = source.system.hp;
            const oldHP = item._source.system.hp;
            const newHPValue = Math.floor(oldHP.value * (newHP.max / oldHP.max));
            return newHPValue === oldHP.value ? [] : { _id: item.id, "system.hp.value": newHPValue };
        });
        if (updates.length > 0) await this.actor.updateEmbeddedDocuments("Item", updates, { render: false });
    }

    #applyAlteration(additionalItems: ItemPF2e<ActorPF2e>[] = []): void {
        // Predicate testing is done per item among specified item type
        if (this.ignored) return;

        const predicate = this.resolveInjectedProperties(this.predicate);
        const actorRollOptions = predicate.length > 0 ? this.actor.getRollOptions() : [];
        try {
            const items: ItemPF2e<ActorPF2e>[] = this.itemId
                ? R.compact([this.actor.items.get(this.resolveInjectedProperties(this.itemId))])
                : this.itemType === "condition"
                ? this.actor.conditions.contents
                : this.actor.itemTypes[this.itemType!];
            items.push(
                ...additionalItems.filter((i) => (this.itemId && i.id === this.itemId) || this.itemType === i.type),
            );

            for (const item of items) {
                const itemRollOptions = predicate.length > 0 ? item.getRollOptions("item") : [];
                const rollOptions = [...actorRollOptions, ...itemRollOptions];
                if (predicate.test(rollOptions)) {
                    const data = R.pick(this, ["mode", "property", "value"]);
                    const alteration = new ItemAlteration(data, { parent: this });
                    alteration.applyTo(item);
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
        /** The type of items to alter */
        itemType: StringField<ItemType, ItemType, false, false, false>;
        /** As an alternative to specifying item types, an exact item ID can be provided */
        itemId: StringField<string, string, false, false, false>;
    };

export { ItemAlterationRuleElement };
