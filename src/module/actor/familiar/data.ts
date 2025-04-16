import { ActorPF2e } from "@actor";
import type {
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureLanguagesData,
    CreaturePerceptionData,
    CreatureResources,
    CreatureSaves,
    CreatureTraitsData,
    SkillData,
} from "@actor/creature/data.ts";
import { ActorSystemModel, ActorSystemSchema } from "@actor/data/model.ts";
import type { ModifierPF2e } from "@actor/modifiers.ts";
import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type {
    ModelPropFromDataField,
    ModelPropsFromSchema,
    SourceFromDataField,
    SourceFromSchema,
} from "@common/data/fields.d.mts";
import type { StatisticTraceData } from "@system/statistic/data.ts";
import type { FamiliarPF2e } from "./document.ts";
import fields = foundry.data.fields;

type FamiliarSource = BaseCreatureSource<"familiar", FamiliarSystemSource>;

class FamiliarSystemData extends ActorSystemModel<FamiliarPF2e, FamiliarSystemSchema> {
    declare traits: CreatureTraitsData;

    declare perception: CreaturePerceptionData;

    declare saves: CreatureSaves;

    declare skills: Record<string, SkillData>;

    declare attack: StatisticTraceData;

    declare resources: CreatureResources;

    static override defineSchema(): FamiliarSystemSchema {
        return {
            ...super.defineSchema(),
            master: new fields.SchemaField({
                id: new fields.ForeignDocumentField(ActorPF2e, {
                    idOnly: true,
                    required: true,
                    nullable: true,
                    initial: null,
                }),
                ability: new fields.StringField({
                    required: true,
                    nullable: true,
                    choices: Array.from(ATTRIBUTE_ABBREVIATIONS),
                    initial: null,
                }),
            }),
            attributes: new fields.SchemaField({
                hp: new fields.SchemaField({
                    value: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: true,
                        min: 0,
                        initial: 5,
                    }),
                    temp: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: true,
                        min: 0,
                        initial: 0,
                    }),
                }),
            }),
            details: new fields.SchemaField({
                creature: new fields.SchemaField({
                    value: new fields.StringField({ required: true, nullable: false, blank: true, initial: "" }),
                }),
            }),
        };
    }
}

interface FamiliarSystemData
    extends foundry.abstract.TypeDataModel<FamiliarPF2e, FamiliarSystemSchema>,
        ModelPropsFromSchema<FamiliarSystemSchema> {
    attributes: CreatureAttributes;
    details: FamiliarDetails;
    customModifiers: Record<string, ModifierPF2e[]>;
}

type FamiliarSystemSchema = ActorSystemSchema & {
    master: fields.SchemaField<{
        id: fields.ForeignDocumentField<string, true, true, true>;
        ability: fields.StringField<AttributeString, AttributeString, true, true, true>;
    }>;
    attributes: fields.SchemaField<{
        hp: fields.SchemaField<{
            value: fields.NumberField<number, number, true, false, true>;
            temp: fields.NumberField<number, number, true, false, true>;
        }>;
    }>;
    details: fields.SchemaField<{
        creature: fields.SchemaField<{
            value: fields.StringField<string, string, true, false, true>;
        }>;
    }>;
};

interface FamiliarSystemSource extends SourceFromSchema<FamiliarSystemSchema> {
    attributes: FamiliarAttributesSource;
    details: FamiliarDetailsSource;
    customModifiers?: never;
    perception?: never;
    resources?: never;
    saves?: never;
    skills?: never;
    traits?: never;
    /** Legacy location of `MigrationRecord` */
    schema?: object;
}

interface FamiliarAttributesSource extends SourceFromDataField<FamiliarSystemSchema["attributes"]> {
    immunities?: never;
    weaknesses?: never;
    resistances?: never;
}

interface FamiliarDetailsSource extends SourceFromDataField<FamiliarSystemSchema["details"]> {
    alliance?: never;
    languages?: never;
    level?: never;
}

interface FamiliarDetails extends ModelPropFromDataField<FamiliarSystemSchema["details"]>, CreatureDetails {
    languages: CreatureLanguagesData;
}

export { FamiliarSystemData };
export type { FamiliarSource, FamiliarSystemSource };
