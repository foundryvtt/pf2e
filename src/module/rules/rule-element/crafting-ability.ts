import type { ActorType, CharacterPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { PredicateField, SlugField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import type {
    ArrayField,
    BooleanField,
    DocumentUUIDField,
    NumberField,
    SchemaField,
} from "types/foundry/common/data/fields.d.ts";
import { RuleElementOptions, RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";

/**
 * @category RuleElement
 */
class CraftingAbilityRuleElement extends RuleElementPF2e<CraftingAbilityRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: CraftingAbilityRuleSource, options: RuleElementOptions) {
        super({ priority: 19, ...data }, options);
    }

    static override defineSchema(): CraftingAbilityRuleSchema {
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
            slug: new SlugField({ required: true, nullable: false, initial: undefined }),
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
            prepared: new fields.ArrayField(
                new fields.SchemaField(
                    {
                        uuid: new fields.DocumentUUIDField({ required: true, blank: false }),
                        quantity: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
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

        const slug = this.resolveInjectedProperties(this.slug);
        this.actor.system.crafting.entries[sluggify(slug, { camel: "dromedary" })] = {
            slug,
            label: this.label,
            isAlchemical: this.isAlchemical,
            isDailyPrep: this.isDailyPrep,
            isPrepared: this.isPrepared,
            batchSizes: this.batchSizes,
            craftableItems: this.craftableItems,
            maxItemLevel: this.maxItemLevel !== undefined ? Number(this.resolveValue(this.maxItemLevel)) : null,
            maxSlots: this.maxSlots,
            preparedFormulaData: this.prepared,
        };

        // Set a roll option to cue subsequent max-item-level-increasing `ActiveEffectLike`s
        this.actor.rollOptions.all[`crafting:entry:${slug}`] = true;
    }
}

interface CraftingAbilityRuleElement
    extends RuleElementPF2e<CraftingAbilityRuleSchema>,
        ModelPropsFromRESchema<CraftingAbilityRuleSchema> {
    readonly parent: ItemPF2e<CharacterPF2e>;
    slug: string;

    get actor(): CharacterPF2e;
}

type CraftingAbilityRuleSchema = Omit<RuleElementSchema, "slug"> & {
    slug: SlugField<true, false, false>;
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
    prepared: ArrayField<SchemaField<PreparedFormulaSchema>>;
};

type QuantityField = NumberField<number, number, true, false, true>;

type PreparedFormulaSchema = {
    uuid: DocumentUUIDField<ItemUUID, true, false, false>;
    quantity: NumberField<number, number, false, false, false>;
    expended: BooleanField<boolean, boolean, false, false, false>;
    isSignatureItem: BooleanField<boolean, boolean, false, false, false>;
};

type CraftingAbilityRuleData = Omit<SourceFromSchema<CraftingAbilityRuleSchema>, "preparedFormulas"> & {
    prepared: (Partial<SourceFromSchema<PreparedFormulaSchema>> & { uuid: string })[];
};

interface CraftingAbilityRuleSource extends RuleElementSource {
    batchSizes?: unknown;
    isAlchemical?: unknown;
    isDailyPrep?: unknown;
    isPrepared?: unknown;
    maxItemLevel?: unknown;
    maxSlots?: unknown;
    craftableItems?: unknown;
    prepared?: unknown;
}

export { CraftingAbilityRuleElement };
export type { CraftingAbilityRuleData, CraftingAbilityRuleSource };
