import type { AttributeString, SkillSlug } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.d.mts";
import { ABCFeatureEntryField } from "@item/abc/data.ts";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import type { BaseItemSourcePF2e, ItemSystemSource, RarityTraitAndOtherTags } from "@item/base/data/system.ts";
import { getCompatSkills, ProficiencyRankField, RarityField } from "@module/model.ts";
import { LaxArrayField, RecordField, SlugField } from "@system/schema-data-fields.ts";
import type { ClassPF2e } from "./document.ts";
import fields = foundry.data.fields;

type ClassSource = BaseItemSourcePF2e<"class", ClassSystemSource>;

class ClassSystemData extends ItemSystemModel<ClassPF2e, ClassSystemSchema> {
    static override LOCALIZATION_PREFIXES = ["PF2E.Item.Class"];

    static override defineSchema(): ClassSystemSchema {
        const createLevelLists = (
            initial?: number[],
        ): fields.SchemaField<{
            value: fields.ArrayField<fields.NumberField<number, number, true, false>>;
        }> =>
            new fields.SchemaField({
                value: new fields.ArrayField(new fields.NumberField({ required: true, min: 1, nullable: false }), {
                    initial,
                }),
            });

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
                rarity: new RarityField(),
            }),
            keyAbility: new fields.SchemaField({
                value: new fields.ArrayField(
                    new fields.StringField({ choices: [...ATTRIBUTE_ABBREVIATIONS], required: true, nullable: false }),
                ),
                selected: new fields.StringField({
                    choices: [...ATTRIBUTE_ABBREVIATIONS],
                    required: true,
                    nullable: true,
                    initial: null,
                }),
            }),
            hp: new fields.NumberField({
                required: true,
                nullable: false,
                min: 4,
                max: 12,
                initial: 6,
            }),
            perception: new ProficiencyRankField(),
            savingThrows: new fields.SchemaField({
                fortitude: new ProficiencyRankField(),
                reflex: new ProficiencyRankField(),
                will: new ProficiencyRankField(),
            }),
            attacks: new fields.SchemaField({
                simple: new ProficiencyRankField(),
                martial: new ProficiencyRankField(),
                advanced: new ProficiencyRankField(),
                unarmed: new ProficiencyRankField(),
                other: new fields.SchemaField({
                    name: new fields.StringField(),
                    rank: new ProficiencyRankField(),
                }),
            }),
            defenses: new fields.SchemaField({
                unarmored: new ProficiencyRankField(),
                light: new ProficiencyRankField(),
                medium: new ProficiencyRankField(),
                heavy: new ProficiencyRankField(),
            }),
            spellcasting: new ProficiencyRankField(),
            trainedSkills: new fields.SchemaField({
                value: new LaxArrayField(
                    new fields.StringField({ choices: getCompatSkills, required: true, nullable: false }),
                ),
                additional: new fields.NumberField({
                    required: true,
                    nullable: false,
                    min: 0,
                    integer: true,
                    initial: 0,
                }),
            }),
            ancestryFeatLevels: createLevelLists([1, 5, 9, 13, 17]),
            classFeatLevels: createLevelLists([1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]),
            generalFeatLevels: createLevelLists([3, 7, 11, 15, 19]),
            skillFeatLevels: createLevelLists([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]),
            skillIncreaseLevels: createLevelLists([3, 5, 7, 9, 11, 13, 15, 17, 19]),
        };
    }
}

interface ClassSystemData
    extends ItemSystemModel<ClassPF2e, ClassSystemSchema>,
        Omit<fields.ModelPropsFromSchema<ClassSystemSchema>, "description"> {
    level?: never;
    traits: RarityTraitAndOtherTags;
}

type ClassSystemSchema = Omit<ItemSystemSchema, "traits"> & {
    items: RecordField<fields.StringField<string, string, true, false>, ABCFeatureEntryField, true, false, true, true>;
    traits: fields.SchemaField<{
        otherTags: fields.ArrayField<SlugField<true, false, false>>;
        rarity: RarityField;
    }>;
    keyAbility: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<AttributeString, AttributeString, true, false>>;
        selected: fields.StringField<AttributeString, AttributeString, true, true, true>;
    }>;
    hp: fields.NumberField<number, number, true, false, true>;
    perception: ProficiencyRankField;
    savingThrows: fields.SchemaField<{
        fortitude: ProficiencyRankField;
        reflex: ProficiencyRankField;
        will: ProficiencyRankField;
    }>;
    attacks: fields.SchemaField<ClassAttackProficienciesSchema>;
    defenses: fields.SchemaField<ClassDefenseProficienciesSchema>;
    /** Starting proficiency in "spell attack rolls and DCs" */
    spellcasting: ProficiencyRankField;
    trainedSkills: fields.SchemaField<{
        value: LaxArrayField<fields.StringField<SkillSlug, SkillSlug, true, false>>;
        additional: fields.NumberField<number, number, true, false, true>;
    }>;
    ancestryFeatLevels: fields.SchemaField<{
        value: fields.ArrayField<fields.NumberField<number, number, true, false>>;
    }>;
    classFeatLevels: fields.SchemaField<{
        value: fields.ArrayField<fields.NumberField<number, number, true, false>>;
    }>;
    generalFeatLevels: fields.SchemaField<{
        value: fields.ArrayField<fields.NumberField<number, number, true, false>>;
    }>;
    skillFeatLevels: fields.SchemaField<{
        value: fields.ArrayField<fields.NumberField<number, number, true, false>>;
    }>;
    skillIncreaseLevels: fields.SchemaField<{
        value: fields.ArrayField<fields.NumberField<number, number, true, false>>;
    }>;
};

type ClassAttackProficienciesSchema = {
    simple: ProficiencyRankField;
    martial: ProficiencyRankField;
    advanced: ProficiencyRankField;
    unarmed: ProficiencyRankField;
    other: fields.SchemaField<{
        name: fields.StringField;
        rank: ProficiencyRankField;
    }>;
};

type ClassDefenseProficienciesSchema = {
    unarmored: ProficiencyRankField;
    light: ProficiencyRankField;
    medium: ProficiencyRankField;
    heavy: ProficiencyRankField;
};

type ClassAttackProficiencies = ModelPropsFromSchema<ClassAttackProficienciesSchema>;
type ClassDefenseProficiencies = ModelPropsFromSchema<ClassDefenseProficienciesSchema>;

type ClassSystemSource = SourceFromSchema<ClassSystemSchema> & {
    level?: never;
    schema?: ItemSystemSource["schema"];
    traits: RarityTraitAndOtherTags;
};

export { ClassSystemData };
export type { ClassAttackProficiencies, ClassDefenseProficiencies, ClassSource, ClassSystemSource };
