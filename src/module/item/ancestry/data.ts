import type { CreatureTrait, Language } from "@actor/creature/index.ts";
import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { ABCFeatureEntryField, type ABCSystemSource } from "@item/abc/index.ts";
import { ItemSystemModel, type ItemSystemSchema } from "@item/base/data/model.ts";
import type { BaseItemSourcePF2e, ItemTraits } from "@item/base/data/system.ts";
import { SIZES, type Size, type TraitsWithRarity, type ValuesList } from "@module/data.ts";
import { RarityField } from "@module/model.ts";
import { RecordField, SlugField } from "@system/schema-data-fields.ts";
import type { AncestryPF2e } from "./document.ts";
import fields = foundry.data.fields;

type AncestrySource = BaseItemSourcePF2e<"ancestry", AncestrySystemSource>;

type CreatureTraits = TraitsWithRarity<CreatureTrait>;
type AncestryTraits = ItemTraits<CreatureTrait>;

interface AncestrySystemSource extends ABCSystemSource {
    traits: AncestryTraits;
    additionalLanguages: {
        count: number; // plus int
        value: string[];
        custom: string;
    };
    /** If present, use the alternate ancestry boosts, which are two free */
    alternateAncestryBoosts?: AttributeString[];
    boosts: Record<string, { value: AttributeString[]; selected: AttributeString | null }>;
    flaws: Record<string, { value: AttributeString[]; selected: AttributeString | null }>;
    voluntary?: {
        boost?: AttributeString | null;
        flaws: AttributeString[];
    };
    hp: number;
    languages: ValuesList<Language>;
    /** This ancestry's base land speed */
    speed: number;
    /** This ancestry's default size category */
    size: Size;
    /** The number of hands this ancestry provides */
    hands: number;
    /** The reach using this ancestry's hands */
    reach: number;
    /** This ancestry's default vision level */
    vision: "normal" | "darkvision" | "low-light-vision";

    level?: never;
}

class AncestrySystemData extends ItemSystemModel<AncestryPF2e, AncestrySystemSchema> {
    static override defineSchema(): AncestrySystemSchema {
        return {
            ...super.defineSchema(),
            traits: new fields.SchemaField({
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
                rarity: new RarityField(),
                value: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
            }),
            items: new RecordField(
                new fields.StringField({ required: true, nullable: false }),
                new ABCFeatureEntryField(),
            ),
            additionalLanguages: new fields.SchemaField({
                count: new fields.NumberField({ nullable: false, initial: 1 }),
                value: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
                custom: new fields.StringField(),
            }),
            alternateAncestryBoosts: new fields.ArrayField(
                new fields.StringField({ required: true, nullable: false, choices: [...ATTRIBUTE_ABBREVIATIONS] }),
            ),
            boosts: new RecordField(
                new fields.StringField({ required: true, nullable: false }),
                new fields.SchemaField({
                    value: new fields.ArrayField(
                        new fields.StringField({ choices: [...ATTRIBUTE_ABBREVIATIONS], required: true }),
                    ),
                    selected: new fields.StringField({ nullable: true }),
                }),
            ),
            flaws: new RecordField(
                new fields.StringField({ required: true, nullable: false }),
                new fields.SchemaField({
                    value: new fields.ArrayField(
                        new fields.StringField({ choices: [...ATTRIBUTE_ABBREVIATIONS], required: true }),
                    ),
                    selected: new fields.StringField({ nullable: true }),
                }),
            ),
            voluntary: new fields.SchemaField(
                {
                    boost: new fields.StringField({
                        nullable: true,
                        required: false,
                        initial: undefined,
                        choices: [...ATTRIBUTE_ABBREVIATIONS],
                    }),
                    flaws: new fields.ArrayField(
                        new fields.StringField({ choices: [...ATTRIBUTE_ABBREVIATIONS], required: true }),
                    ),
                },
                { required: false, initial: undefined },
            ),
            hp: new fields.NumberField({ required: true, initial: 6, min: 0, max: 12, step: 2, nullable: false }),
            languages: new fields.SchemaField({
                value: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
            }),
            speed: new fields.NumberField({ required: true, initial: 25, min: 0, max: 60, step: 5, nullable: false }),
            size: new fields.StringField({ required: true, nullable: false, initial: "med", choices: [...SIZES] }),
            hands: new fields.NumberField({ required: true, initial: 2, min: 0, max: 12, step: 2, nullable: false }),
            reach: new fields.NumberField({ required: true, initial: 5, min: 0, max: 25, step: 5, nullable: false }),
            vision: new fields.StringField({
                required: true,
                nullable: false,
                initial: "normal",
                choices: ["normal", "darkvision", "low-light-vision"],
            }),
        };
    }
}

type BoostOrFlawSchema = {
    value: fields.ArrayField<fields.StringField<AttributeString, AttributeString, true, false, false>>;
    selected: fields.StringField<AttributeString, AttributeString, false, true, false>;
};

type AncestrySystemSchema = Omit<ItemSystemSchema, "traits"> & {
    traits: fields.SchemaField<{
        otherTags: fields.ArrayField<SlugField<true, false, false>>;
        rarity: RarityField;
        value: fields.ArrayField<fields.StringField<CreatureTrait, CreatureTrait, true, false, false>>;
    }>;
    items: RecordField<fields.StringField<string, string, true, false>, ABCFeatureEntryField, true, false, true, true>;
    additionalLanguages: fields.SchemaField<{
        count: fields.NumberField<number, number, false, false, true>;
        value: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
        custom: fields.StringField;
    }>;
    alternateAncestryBoosts: fields.ArrayField<
        fields.StringField<AttributeString, AttributeString, true, false, false>
    >;
    boosts: RecordField<
        fields.StringField<string, string, true, false>,
        fields.SchemaField<BoostOrFlawSchema>,
        true,
        false,
        true,
        true
    >;
    flaws: RecordField<
        fields.StringField<string, string, true, false>,
        fields.SchemaField<BoostOrFlawSchema>,
        true,
        false,
        true,
        true
    >;
    voluntary: fields.SchemaField<
        {
            boost?: fields.StringField<AttributeString, AttributeString, false, true, false>;
            flaws: fields.ArrayField<fields.StringField<AttributeString, AttributeString, true, false, false>>;
        },
        {
            boost?: AttributeString | null;
            flaws: AttributeString[];
        },
        {
            boost?: AttributeString | null;
            flaws: AttributeString[];
        },
        false,
        false,
        false
    >;
    hp: fields.NumberField<number, number, true, false, true>;
    languages: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<Language, Language, true, false, false>>;
    }>;
    speed: fields.NumberField<number, number, true, false, true>;
    size: fields.StringField<Size, Size, true, false, true>;
    hands: fields.NumberField<number, number, true, false, true>;
    reach: fields.NumberField<number, number, true, false, true>;
    vision: fields.StringField<
        "normal" | "darkvision" | "low-light-vision",
        "normal" | "darkvision" | "low-light-vision",
        true,
        false,
        true
    >;
};

interface AncestrySystemData
    extends
        ItemSystemModel<AncestryPF2e, AncestrySystemSchema>,
        Omit<fields.ModelPropsFromSchema<AncestrySystemSchema>, "description" | "traits" | "level"> {
    traits: AncestryTraits;
}

export { AncestrySystemData };
export type { AncestrySource, AncestrySystemSource, AncestryTraits, CreatureTraits };
