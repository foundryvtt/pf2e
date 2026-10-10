import type { CreatureTrait, Language } from "@actor/creature/index.ts";
import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { ABCFeatureEntryField } from "@item/abc/data.ts";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import type { BaseItemSourcePF2e, ItemSystemSource } from "@item/base/data/system.ts";
import { SIZES, type Size } from "@module/data.ts";
import { RarityField } from "@module/model.ts";
import { LaxArrayField, RecordField, SlugField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import type { AncestryPF2e } from "./document.ts";
import fields = foundry.data.fields;

type AncestrySource = BaseItemSourcePF2e<"ancestry", AncestrySystemSource>;

class AncestrySystemData extends ItemSystemModel<AncestryPF2e, AncestrySystemSchema> {
    static override defineSchema(): AncestrySystemSchema {
        const creatureTraits: Record<CreatureTrait, string> = CONFIG.PF2E.creatureTraits;
        const attributeField = (): fields.StringField<AttributeString, AttributeString, true, false, false> =>
            new fields.StringField({
                required: true,
                nullable: false,
                choices: [...ATTRIBUTE_ABBREVIATIONS],
                initial: undefined,
            });
        const attributeSlots = (
            initial: () => Record<string, { value: AttributeString[]; selected: null }>,
        ): AttributeSlotsField =>
            new RecordField(
                new fields.StringField({ required: true, nullable: false, blank: false }),
                new fields.SchemaField({
                    value: new fields.ArrayField(attributeField()),
                    selected: new fields.StringField({
                        required: true,
                        nullable: true,
                        choices: [...ATTRIBUTE_ABBREVIATIONS],
                        initial: null,
                    }),
                }),
                { initial },
            );
        const integerField = (
            initial: number,
            bounds: { min: number; max: number; step?: number },
        ): fields.NumberField<number, number, true, false, true> =>
            new fields.NumberField({ required: true, nullable: false, integer: true, ...bounds, initial });

        return {
            ...super.defineSchema(),
            items: new RecordField(
                new fields.StringField({ required: true, nullable: false }),
                new ABCFeatureEntryField(),
            ),
            traits: new fields.SchemaField({
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
                value: new LaxArrayField(
                    new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: creatureTraits,
                        initial: undefined,
                    }),
                ),
                rarity: new RarityField(),
            }),
            additionalLanguages: new fields.SchemaField({
                count: integerField(0, { min: 0, max: 99 }),
                value: new LaxArrayField(new fields.StringField({ required: true, nullable: false, blank: false })),
                custom: new fields.StringField({ required: true, nullable: false, blank: true, initial: "" }),
            }),
            alternateAncestryBoosts: new fields.ArrayField(attributeField(), {
                required: true,
                nullable: true,
                initial: null,
            }),
            boosts: attributeSlots(() => ({
                0: { value: [], selected: null },
                1: { value: [], selected: null },
                2: { value: [...ATTRIBUTE_ABBREVIATIONS], selected: null },
            })),
            flaws: attributeSlots(() => ({ 0: { value: [], selected: null } })),
            voluntary: new fields.SchemaField({
                legacy: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                boost: new fields.StringField({
                    required: true,
                    nullable: true,
                    choices: [...ATTRIBUTE_ABBREVIATIONS],
                    initial: null,
                }),
                flaws: new fields.ArrayField(attributeField()),
            }),
            hp: integerField(6, { min: 4, max: 12, step: 2 }),
            languages: new fields.SchemaField({
                value: new LaxArrayField(
                    new fields.StringField<Language, Language, true, false, false>({
                        required: true,
                        nullable: false,
                        blank: false,
                    }),
                    { initial: () => ["common"] },
                ),
                custom: new fields.StringField({ required: true, nullable: false, blank: true, initial: "" }),
            }),
            speed: integerField(25, { min: 0, max: 100, step: 5 }),
            size: new fields.StringField({ required: true, nullable: false, choices: [...SIZES], initial: "med" }),
            hands: integerField(2, { min: 0, max: 12, step: 2 }),
            reach: integerField(5, { min: 0, max: 100, step: 5 }),
            vision: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["normal", "darkvision", "low-light-vision"],
                initial: "normal",
            }),
        };
    }

    /** Values renamed by numbered migrations would otherwise fail validation before those migrations run. */
    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        const migrated = super.migrateData(source);
        if (migrated.vision === "lowLightVision") migrated.vision = "low-light-vision";
        // Legacy mode was previously signaled by the presence of a `boost` key. Also runs on partial updates.
        const voluntary = migrated.voluntary;
        if (R.isPlainObject(voluntary) && !("legacy" in voluntary)) {
            if (voluntary.boost === null || typeof voluntary.boost === "string") voluntary.legacy = true;
        }
        const traits = migrated.traits;
        if (R.isPlainObject(traits) && Array.isArray(traits.value)) {
            traits.value = R.unique(traits.value.map((t) => RENAMED_TRAITS[String(t)] ?? t)).sort();
        }
        return migrated;
    }
}

/** Creature traits renamed by Migration888 and Migration958 */
const RENAMED_TRAITS: Record<string, CreatureTrait | undefined> = {
    aasimar: "nephilim",
    gnoll: "kholo",
    grippli: "tripkee",
    "half-elf": "aiuvarin",
    "half-orc": "dromaar",
    ifrit: "naari",
    tiefling: "nephilim",
};

interface AncestrySystemData
    extends
        ItemSystemModel<AncestryPF2e, AncestrySystemSchema>,
        Omit<fields.ModelPropsFromSchema<AncestrySystemSchema>, "description"> {
    level?: never;
}

type AttributeSlotSchema = {
    value: fields.ArrayField<fields.StringField<AttributeString, AttributeString, true, false, false>>;
    selected: fields.StringField<AttributeString, AttributeString, true, true, true>;
};

type AttributeSlotsField = RecordField<
    fields.StringField<string, string, true, false>,
    fields.SchemaField<AttributeSlotSchema>,
    true,
    false,
    true,
    true
>;

type VoluntarySchema = {
    /** Pre-remaster voluntary flaws, which grant a boost after two flaws */
    legacy: fields.BooleanField<boolean, boolean, true, false, true>;
    boost: fields.StringField<AttributeString, AttributeString, true, true, true>;
    flaws: fields.ArrayField<fields.StringField<AttributeString, AttributeString, true, false, false>>;
};

type AncestrySystemSchema = Omit<ItemSystemSchema, "traits"> & {
    items: RecordField<fields.StringField<string, string, true, false>, ABCFeatureEntryField, true, false, true, true>;
    traits: fields.SchemaField<{
        value: LaxArrayField<fields.StringField<CreatureTrait, CreatureTrait, true, false, false>>;
        otherTags: fields.ArrayField<SlugField<true, false, false>>;
        rarity: RarityField;
    }>;
    additionalLanguages: fields.SchemaField<{
        count: fields.NumberField<number, number, true, false, true>;
        value: LaxArrayField<fields.StringField<string, string, true, false, false>>;
        custom: fields.StringField<string, string, true, false, true>;
    }>;
    /** If non-null, use the alternate ancestry boosts, which are two free */
    alternateAncestryBoosts: fields.ArrayField<
        fields.StringField<AttributeString, AttributeString, true, false, false>,
        AttributeString[],
        AttributeString[],
        true,
        true,
        true
    >;
    boosts: AttributeSlotsField;
    flaws: AttributeSlotsField;
    voluntary: fields.SchemaField<VoluntarySchema>;
    hp: fields.NumberField<number, number, true, false, true>;
    languages: fields.SchemaField<{
        value: LaxArrayField<fields.StringField<Language, Language, true, false, false>>;
        custom: fields.StringField<string, string, true, false, true>;
    }>;
    /** This ancestry's base land speed */
    speed: fields.NumberField<number, number, true, false, true>;
    /** This ancestry's default size category */
    size: fields.StringField<Size, Size, true, false, true>;
    /** The number of hands this ancestry provides */
    hands: fields.NumberField<number, number, true, false, true>;
    /** The reach using this ancestry's hands */
    reach: fields.NumberField<number, number, true, false, true>;
    /** This ancestry's default vision level */
    vision: fields.StringField<AncestryVision, AncestryVision, true, false, true>;
};

type AncestryVision = "normal" | "darkvision" | "low-light-vision";

type AncestrySystemSource = fields.SourceFromSchema<AncestrySystemSchema> & {
    level?: never;
    schema?: ItemSystemSource["schema"];
};

export { AncestrySystemData };
export type { AncestrySource, AncestrySystemSource };
