import type { ActorPF2e } from "@actor";
import type { ItemPF2e, PhysicalItemPF2e } from "@item";
import type { ItemType } from "@item/base/data/index.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import * as R from "remeda";
import { AELikeRuleElement } from "../ae-like.ts";
import { RuleElementOptions, RuleElementPF2e } from "../base.ts";
import type { ModelPropsFromRESchema, RuleElementSchema, RuleElementSource } from "../data.ts";
import { ItemAlteration, ItemAlterationProperty, ItemAlterationSchema } from "./alteration.ts";
import fields = foundry.data.fields;

class ItemAlterationRuleElement extends RuleElementPF2e<ItemAlterationRuleSchema> {
    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super(data, options);

        // Force false if there is no way this RE is relevant to ABP. This doesn't lead to any runtime changes
        const abpRelevantProperties: ItemAlterationProperty[] = ["potency", "striking", "resilient"];
        if (!this.item.isOfType("physical") && !abpRelevantProperties.includes(this.property)) {
            this.fromEquipment = false;
        }
    }

    static override defineSchema(): ItemAlterationRuleSchema {
        // Set a default priority according to AE mode yet still later than AE-likes
        const baseSchema = super.defineSchema();
        const PRIORITIES: Record<string, number | undefined> = AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES;
        baseSchema.priority.initial = (d) => (PRIORITIES[String(d.mode)] ?? 50) + 100;
        const itemTypeChoices: Record<ItemType, string> = R.mapValues(
            CONFIG.PF2E.Item.documentClasses,
            (key) => `TYPES.Item.${key}`,
        );

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
                choices: itemTypeChoices,
                initial: undefined,
            }),
            battleForm: new fields.BooleanField(),
            ...ItemAlteration.defineSchema(),
        };
    }

    static override validateJoint(data: fields.SourceFromSchema<ItemAlterationRuleSchema>): void {
        super.validateJoint(data);

        if (!data.itemId && !data.itemType) {
            throw Error("one of itemId and itemType must be defined");
        }
    }

    /** Alteration properties that should be processed at the end of data preparation */
    static #DELAYED_PROPERTIES = ["pd-recovery-dc"];

    /** Alteration properties that should only be processed when requested directly */
    static #LAZY_PROPERTIES = ["description"];

    /** If this item alteration is lazy and should be applied only when requested */
    get isLazy(): boolean {
        return this.constructor.#LAZY_PROPERTIES.includes(this.property);
    }

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
            const alterationData = R.pick(this, ["mode", "property", "value", "fromEquipment"] as const);
            const alteration = new ItemAlteration(alterationData, { parent: this });
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
        const actor = this.actor;
        if (this.ignored) return;
        if (this.battleForm && !this.predicate.includes("battle-form")) this.predicate.push("battle-form");

        actor.synthetics.itemAlterations.push(this);
        const isDelayed = this.constructor.#DELAYED_PROPERTIES.includes(this.property);
        if (!this.isLazy && !isDelayed) {
            this.applyAlteration();
        }
    }

    override afterPrepareData(): void {
        if (this.ignored) return;
        const isDelayed = this.constructor.#DELAYED_PROPERTIES.includes(this.property);
        if (!this.isLazy && isDelayed) {
            this.applyAlteration();
        }
    }

    applyAlteration({ singleItem = null, additionalItems = [] }: ApplyAlterationOptions = {}): void {
        // Predicate testing is done per item among specified item type
        if (this.ignored) return;

        try {
            const itemId = this.itemId ? this.resolveInjectedProperties(this.itemId) : null;
            const items = singleItem
                ? singleItem.id === itemId || singleItem.type === this.itemType
                    ? [singleItem]
                    : []
                : this.#getItemsOfType();
            items.push(...additionalItems.filter((i) => (itemId && i.id === itemId) || this.itemType === i.type));

            // Check if there are no items to process first (commmon if its a single item alteration)
            if (items.length === 0) return;

            const predicate = this.resolveInjectedProperties(this.predicate);
            const [actorRollOptions, parentRollOptions] =
                predicate.length > 0 ? [this.actor.getRollOptions(), this.parent.getRollOptions("parent")] : [[], []];

            for (const item of items) {
                const itemRollOptions = predicate.length > 0 ? item.getRollOptions("item") : [];
                const rollOptions = [actorRollOptions, parentRollOptions, itemRollOptions].flat();
                if (predicate.test(rollOptions)) {
                    const data = R.pick(this, ["mode", "property", "value", "fromEquipment"]);
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
            return [item].filter(R.isTruthy);
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
        itemType: fields.StringField<ItemType, ItemType, false, false, false>;
        /** As an alternative to specifying item types, an exact item ID can be provided */
        itemId: fields.StringField<string, string, false, false, false>;
        /** Whether this rule element is compatible with battle forms */
        battleForm: fields.BooleanField;
    };

interface ApplyAlterationOptions {
    /** A single item to on which to run alterations instead of all qualifying items owned by the actor */
    singleItem?: ItemPF2e<ActorPF2e> | null;
    additionalItems?: ItemPF2e<ActorPF2e>[];
}

export { ItemAlterationRuleElement };
