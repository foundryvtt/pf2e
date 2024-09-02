import type { ActorType, CharacterPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { PredicateField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import type {
    ArrayField,
    BooleanField,
    NumberField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import { RuleElementOptions, RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";

/**
 * @category RuleElement
 */
class CraftingEntryRuleElement extends RuleElementPF2e<CraftingEntryRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: CraftingEntryRuleSource, options: RuleElementOptions) {
        super({ priority: 19, ...data }, options);
    }

    static override defineSchema(): CraftingEntryRuleSchema {
        const fields = foundry.data.fields;
        const quantityField = (): QuantityField =>
            new fields.NumberField({
                required: true,
                nullable: false,
                positive: true,
                integer: true,
                initial: 2,
                min: 1,
                max: 99,
            });

        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false, initial: undefined }),
            isAlchemical: new fields.BooleanField(),
            isDailyPrep: new fields.BooleanField(),
            isPrepared: new fields.BooleanField(),
            batchSizes: new fields.SchemaField(
                {
                    default: quantityField(),
                    other: new fields.ArrayField(
                        new fields.SchemaField({ quantity: quantityField(), definition: new PredicateField() }),
                    ),
                },
                { initial: (d) => ({ default: d.isAlchemical ? 2 : 1, other: [] }) },
            ),
            maxItemLevel: new ResolvableValueField({ required: false, nullable: false }),
            maxSlots: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
            craftableItems: new PredicateField(),
            preparedFormulas: new fields.ArrayField(
                new fields.SchemaField(
                    {
                        itemUUID: new fields.StringField({ required: true, blank: false }),
                        quantity: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
                        sort: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
                        expended: new fields.BooleanField({ required: false, initial: undefined }),
                        isSignatureItem: new fields.BooleanField({ required: false, initial: undefined }),
                    },
                    { required: true, nullable: false },
                ),
                { initial: [] },
            ),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);

        const entryData = {
            selector: selector,
            name: this.label,
            item: this.item,
            isAlchemical: this.isAlchemical,
            isDailyPrep: this.isDailyPrep,
            isPrepared: this.isPrepared,
            batchSizes: this.batchSizes,
            craftableItems: this.craftableItems,
            maxItemLevel: this.maxItemLevel !== undefined ? Number(this.resolveValue(this.maxItemLevel)) : null,
            maxSlots: this.maxSlots,
            preparedFormulaData: this.preparedFormulas,
        };
        Object.defineProperty(entryData, "item", { enumerable: false });
        this.actor.system.crafting.entries[this.selector] = entryData;

        // Set a roll option to cue any subsequent max-item-level-increasing `ActiveEffectLike`s
        const option = sluggify(this.selector);
        this.actor.rollOptions.all[`crafting:entry:${option}`] = true;
    }
}

interface CraftingEntryRuleElement
    extends RuleElementPF2e<CraftingEntryRuleSchema>,
        ModelPropsFromRESchema<CraftingEntryRuleSchema> {
    readonly parent: ItemPF2e<CharacterPF2e>;

    get actor(): CharacterPF2e;
}

type CraftingEntryRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    isAlchemical: BooleanField<boolean, boolean, false, false, true>;
    isDailyPrep: BooleanField<boolean, boolean, false, false, true>;
    isPrepared: BooleanField<boolean, boolean, false, false, true>;
    batchSizes: SchemaField<{
        default: QuantityField;
        other: ArrayField<SchemaField<{ quantity: QuantityField; definition: PredicateField }>>;
    }>;
    maxItemLevel: ResolvableValueField<false, false, true>;
    maxSlots: NumberField<number, number, false, false, false>;
    craftableItems: PredicateField;
    preparedFormulas: ArrayField<SchemaField<PreparedFormulaSchema>>;
};

type QuantityField = NumberField<number, number, true, false, true>;

type PreparedFormulaSchema = {
    itemUUID: StringField<string, string, true, false, false>;
    quantity: NumberField<number, number, false, false, false>;
    sort: NumberField<number, number, false, false, false>;
    expended: BooleanField<boolean, boolean, false, false, false>;
    isSignatureItem: BooleanField<boolean, boolean, false, false, false>;
};

type CraftingEntryRuleData = Omit<SourceFromSchema<CraftingEntryRuleSchema>, "preparedFormulas"> & {
    preparedFormulas: (Partial<SourceFromSchema<PreparedFormulaSchema>> & { itemUUID: string })[];
};

interface CraftingEntryRuleSource extends RuleElementSource {
    selector?: unknown;
    name?: unknown;
    batchSizes?: unknown;
    isAlchemical?: unknown;
    isDailyPrep?: unknown;
    isPrepared?: unknown;
    maxItemLevel?: unknown;
    maxSlots?: unknown;
    craftableItems?: unknown;
    preparedFormulas?: unknown;
}

export { CraftingEntryRuleElement };
export type { CraftingEntryRuleData, CraftingEntryRuleSource };
