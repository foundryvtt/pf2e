import type { ActorPF2e } from "@actor";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import { ItemType } from "@item/base/data/index.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import * as R from "remeda";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeRuleElement } from "../ae-like.ts";
import { RuleElementPF2e } from "../base.ts";
import { ModelPropsFromRESchema, RuleElementSchema } from "../data.ts";
import { ItemAlteration, ItemAlterationSchema } from "./alteration.ts";

class ItemAlterationRuleElement extends RuleElementPF2e<ItemAlterationRuleSchema> {
    static override defineSchema(): ItemAlterationRuleSchema {
        const fields = foundry.data.fields;

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

    /** Alteration properties that should be processed at the end of data preparation */
    static #DELAYED_PROPERTIES = ["pd-recovery-dc"];

    override async preCreate({ tempItems }: RuleElementPF2e.PreCreateParams): Promise<void> {
        if (this.ignored) return;

        // Apply feature/feature alterations during pre-creation to possibly inform subsequent REs like choice sets
        if (this.itemType === "feat") {
            this.applyAlteration({ additionalItems: tempItems });
        }

        // If this RE alters max HP, proportionally adjust current HP of items it would match against
        if (this.property !== "hp-max") return;

        const itemsOfType: ItemPF2e<ActorPF2e>[] = this.itemType ? this.actor.itemTypes[this.itemType] : [];
        const actorRollOptions = this.actor.getRollOptions();
        const parentRollOptions = this.parent.getRollOptions("parent");
        const predicate = this.resolveInjectedProperties(this.predicate);
        const itemsToAlter = itemsOfType.filter((i): i is PhysicalItemPF2e<ActorPF2e> =>
            predicate.test([actorRollOptions, parentRollOptions, i.getRollOptions("item")].flat()),
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
        if (updates.length > 0) {
            await this.actor.updateEmbeddedDocuments("Item", updates, { render: false, checkHP: false });
        }
    }

    override onApplyActiveEffects(): void {
        if (!this.constructor.#DELAYED_PROPERTIES.includes(this.property)) {
            this.applyAlteration();
        }
    }

    override afterPrepareData(): void {
        if (this.constructor.#DELAYED_PROPERTIES.includes(this.property)) {
            this.applyAlteration();
        }
    }

    applyAlteration({ singleItem = null, additionalItems = [] }: ApplyAlterationOptions = {}): void {
        // Predicate testing is done per item among specified item type
        if (this.ignored) return;

        const predicate = this.resolveInjectedProperties(this.predicate);
        const [actorRollOptions, parentRollOptions] =
            predicate.length > 0 ? [this.actor.getRollOptions(), this.parent.getRollOptions("parent")] : [[], []];
        try {
            const items = singleItem
                ? singleItem.id === this.itemId || singleItem.type === this.itemType
                    ? [singleItem]
                    : []
                : this.#getItemsOfType();
            items.push(
                ...additionalItems.filter((i) => (this.itemId && i.id === this.itemId) || this.itemType === i.type),
            );

            for (const item of items) {
                const itemRollOptions = predicate.length > 0 ? item.getRollOptions("item") : [];
                const rollOptions = [actorRollOptions, parentRollOptions, itemRollOptions].flat();
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

    /** Get all items of the requested type (or `id`), searching subitems if necessary */
    #getItemsOfType(): ItemPF2e<ActorPF2e>[] {
        if (this.itemId) {
            const itemId = this.resolveInjectedProperties(this.itemId);
            const item =
                this.actor.items.get(itemId) ??
                this.actor.inventory.flatMap((i) => i.subitems.contents).find((i) => i.id === itemId);
            return R.compact([item]);
        }

        if (this.itemType === "condition") {
            return this.actor.conditions.contents;
        }

        if (this.itemType) {
            const physicalItemTypes: Set<string> = PHYSICAL_ITEM_TYPES;
            return physicalItemTypes.has(this.itemType)
                ? [
                      this.actor.itemTypes[this.itemType],
                      this.actor.inventory.map((i) => i.subitems.filter((s) => s.type === this.itemType)),
                  ].flat(2)
                : this.actor.itemTypes[this.itemType];
        }

        return [];
    }
}

interface ItemAlterationRuleElement
    extends RuleElementPF2e<ItemAlterationRuleSchema>,
        ModelPropsFromRESchema<ItemAlterationRuleSchema> {
    constructor: typeof ItemAlterationRuleElement;
}

type ItemAlterationRuleSchema = RuleElementSchema &
    ItemAlterationSchema & {
        /** The type of items to alter */
        itemType: StringField<ItemType, ItemType, false, false, false>;
        /** As an alternative to specifying item types, an exact item ID can be provided */
        itemId: StringField<string, string, false, false, false>;
    };

interface ApplyAlterationOptions {
    /** A single item to on which to run alterations instead of all qualifying items owned by the actor */
    singleItem?: ItemPF2e<ActorPF2e> | null;
    additionalItems?: ItemPF2e<ActorPF2e>[];
}

export { ItemAlterationRuleElement };
