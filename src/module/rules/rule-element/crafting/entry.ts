import { CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { sluggify } from "@util";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "../index.ts";
import type {
    ArrayField,
    BooleanField,
    NumberField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import { ResolvableValueField } from "../data.ts";

/**
 * @category RuleElement
 */
class CraftingEntryRuleElement extends RuleElementPF2e<CraftingEntryRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    static override defineSchema(): CraftingEntryRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false }),
            isAlchemical: new fields.BooleanField({ required: false, initial: undefined }),
            isDailyPrep: new fields.BooleanField({ required: false, initial: undefined }),
            isPrepared: new fields.BooleanField({ required: false, initial: undefined }),
            maxItemLevel: new ResolvableValueField({ required: false, nullable: false, initial: 1 }),
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
                    { required: true, nullable: false }
                ),
                { initial: [] }
            ),
        };
    }

    constructor(data: CraftingEntryRuleSource, options: RuleElementOptions) {
        super({ priority: 19, ...data }, options);
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);

        const craftableItems = this.craftableItems ?? [];
        if (!PredicatePF2e.isValid(craftableItems)) {
            return this.failValidation("Malformed craftableItems predicate");
        }

        this.actor.system.crafting.entries[this.selector] = {
            selector: selector,
            name: this.label,
            isAlchemical: this.isAlchemical,
            isDailyPrep: this.isDailyPrep,
            isPrepared: this.isPrepared,
            craftableItems,
            maxItemLevel: Number(this.resolveValue(this.maxItemLevel)) || 1,
            maxSlots: this.maxSlots,
            parentItem: this.item.id,
            preparedFormulaData: this.preparedFormulas,
        };

        // Set a roll option to cue any subsequent max-item-level-increasing `ActiveEffectLike`s
        const option = sluggify(this.selector);
        this.actor.rollOptions.all[`crafting:entry:${option}`] = true;
    }
}

interface CraftingEntryRuleElement
    extends RuleElementPF2e<CraftingEntryRuleSchema>,
        ModelPropsFromSchema<CraftingEntryRuleSchema> {
    get actor(): CharacterPF2e;
}

type CraftingEntryRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    isAlchemical: BooleanField<boolean, boolean, false, false, false>;
    isDailyPrep: BooleanField<boolean, boolean, false, false, false>;
    isPrepared: BooleanField<boolean, boolean, false, false, false>;
    maxItemLevel: ResolvableValueField<false, false, true>;
    maxSlots: NumberField<number, number, false, false, false>;
    craftableItems: PredicateField<false, false, false>;
    preparedFormulas: ArrayField<SchemaField<PreparedFormulaSchema>>;
};

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
    isAlchemical?: unknown;
    isDailyPrep?: unknown;
    isPrepared?: unknown;
    maxItemLevel?: unknown;
    maxSlots?: unknown;
    craftableItems?: unknown;
    preparedFormulas?: unknown;
}

export { CraftingEntryRuleData, CraftingEntryRuleElement, CraftingEntryRuleSource };
