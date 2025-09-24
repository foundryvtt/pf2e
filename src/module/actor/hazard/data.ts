import { ActorAttributes, ActorDetails, ActorHitPoints, BaseActorSourcePF2e } from "@actor/data/base.ts";
import { Immunity, Resistance, Weakness } from "@actor/data/iwr.ts";
import { ActorHitPointsSchema, ActorSystemModel, ActorSystemSchema } from "@actor/data/model.ts";
import type { ActorSizePF2e } from "@actor/data/size.ts";
import type { InitiativeTraceData } from "@actor/initiative.ts";
import type { NPCStrike } from "@actor/npc/index.ts";
import type { ImmunityType, ResistanceType, WeaknessType } from "@actor/types.ts";
import type { Rarity, Size } from "@module/data.ts";
import { PublicationField, RarityField } from "@module/model.ts";
import { DataUnionField, LaxArrayField } from "@system/schema-data-fields.ts";
import type { StatisticTraceData } from "@system/statistic/data.ts";
import type { HazardPF2e } from "./document.ts";
import type { HazardTrait } from "./types.ts";
import fields = foundry.data.fields;

/** The stored source data of a hazard actor */
type HazardSource = BaseActorSourcePF2e<"hazard", HazardSystemSource>;

class HazardSystemData extends ActorSystemModel<HazardPF2e, HazardSystemSchema> {
    static override defineSchema(): HazardSystemSchema {
        const hazardTraits: Record<HazardTrait, string> = CONFIG.PF2E.hazardTraits;
        const sizes: Record<Size, string> = CONFIG.PF2E.actorSizes;
        const immunityTypes: Record<ImmunityType, string> = CONFIG.PF2E.immunityTypes;
        const weaknessTypes: Record<WeaknessType, string> = CONFIG.PF2E.weaknessTypes;
        const resistanceTypes: Record<ResistanceType, string> = CONFIG.PF2E.resistanceTypes;

        const requiredInteger = ({ min, initial = min }: { min: number; initial?: number }) =>
            new fields.NumberField<number, number, true, false, boolean>({
                required: true,
                nullable: false,
                integer: true,
                min,
                initial,
            });
        const blankableString = () =>
            new fields.StringField({ required: true, nullable: false, blank: true, initial: "" });

        const createSaveDataSchema = () =>
            new fields.SchemaField<HazardSaveDataSchema>({
                value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
            });

        return {
            ...super.defineSchema(),
            traits: new fields.SchemaField({
                value: new LaxArrayField(
                    new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: hazardTraits,
                        initial: undefined,
                    }),
                ),
                rarity: new RarityField(),
                size: new fields.SchemaField({
                    value: new fields.StringField({ required: true, nullable: false, choices: sizes, initial: "lg" }),
                }),
            }),
            attributes: new fields.SchemaField({
                hp: new fields.SchemaField({
                    value: requiredInteger({ min: 0 }),
                    max: requiredInteger({ min: 0 }),
                    temp: requiredInteger({ min: 0 }),
                    details: blankableString(),
                }),
                ac: new fields.SchemaField({
                    value: new fields.NumberField(),
                }),

                hardness: requiredInteger({ min: 0 }),
                stealth: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: true, initial: null }),
                    details: blankableString(),
                }),
                immunities: new LaxArrayField(
                    new fields.SchemaField({
                        type: new fields.StringField({
                            required: true,
                            nullable: false,
                            choices: immunityTypes,
                            initial: undefined,
                        }),
                        exceptions: new LaxArrayField(
                            new fields.StringField({
                                required: true,
                                nullable: false,
                                choices: immunityTypes,
                                initial: undefined,
                            }),
                        ),
                    }),
                ),
                weaknesses: new LaxArrayField(
                    new fields.SchemaField({
                        type: new fields.StringField({
                            required: true,
                            nullable: false,
                            choices: weaknessTypes,
                            initial: undefined,
                        }),
                        value: requiredInteger({ min: 1 }),
                        exceptions: new LaxArrayField(
                            new fields.StringField({
                                required: true,
                                nullable: false,
                                choices: weaknessTypes,
                                initial: undefined,
                            }),
                        ),
                    }),
                ),
                resistances: new LaxArrayField(
                    new fields.SchemaField({
                        type: new fields.StringField({
                            required: true,
                            nullable: false,
                            choices: resistanceTypes,
                            initial: undefined,
                        }),
                        value: requiredInteger({ min: 1 }),
                        exceptions: new LaxArrayField(
                            new fields.StringField({
                                required: true,
                                nullable: false,
                                choices: resistanceTypes,
                                initial: undefined,
                            }),
                        ),
                        doubleVs: new LaxArrayField(
                            new fields.StringField({
                                required: true,
                                nullable: false,
                                choices: resistanceTypes,
                                initial: undefined,
                            }),
                        ),
                    }),
                ),
                emitsSound: new DataUnionField(
                    [
                        new fields.StringField<"encounter", "encounter", true, false, false>({
                            required: true,
                            nullable: false,
                            choices: ["encounter"] as const,
                            initial: undefined,
                        }),
                        new fields.BooleanField<boolean, boolean, true, false, false>({
                            required: true,
                            nullable: false,
                            initial: undefined,
                        }),
                    ],
                    { required: true, nullable: false, initial: "encounter" },
                ),
            }),
            details: new fields.SchemaField({
                description: new fields.HTMLField({ required: true, nullable: false, initial: "" }),
                level: new fields.SchemaField({
                    value: requiredInteger({ min: -1, initial: 1 }),
                }),
                isComplex: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                disable: blankableString(),
                routine: blankableString(),
                reset: blankableString(),
                publication: new PublicationField(),
            }),
            saves: new fields.SchemaField({
                fortitude: createSaveDataSchema(),
                reflex: createSaveDataSchema(),
                will: createSaveDataSchema(),
            }),
        };
    }
}

interface HazardSystemData
    extends ActorSystemModel<HazardPF2e, HazardSystemSchema>,
        fields.ModelPropsFromSchema<HazardSystemSchema> {
    traits: HazardTraits;
    attributes: HazardAttributes;
    details: HazardDetails;
    actions: NPCStrike[];
    initiative?: InitiativeTraceData;
}

type HazardSystemSchema = ActorSystemSchema & {
    /** Traits, languages, and other information. */
    traits: fields.SchemaField<HazardTraitsSchema>;
    attributes: fields.SchemaField<
        HazardAttributesSchema,
        fields.SourceFromSchema<HazardAttributesSchema>,
        HazardAttributes
    >;
    details: fields.SchemaField<HazardDetailsSchema>;
    saves: fields.SchemaField<{
        fortitude: fields.SchemaField<HazardSaveDataSchema>;
        reflex: fields.SchemaField<HazardSaveDataSchema>;
        will: fields.SchemaField<HazardSaveDataSchema>;
    }>;
};

type HazardTraitsSchema = {
    value: fields.ArrayField<fields.StringField<HazardTrait, HazardTrait, true, false, false>>;
    rarity: fields.StringField<Rarity, Rarity, true, false, true>;
    size: fields.SchemaField<{
        value: fields.StringField<Size, Size, true, false, true>;
    }>;
};

interface HazardTraits extends fields.ModelPropsFromSchema<HazardTraitsSchema> {
    size: ActorSizePF2e;
}

type HazardSaveDataSchema = {
    value: fields.NumberField<number, number, true, false, true>;
};

type HazardAttributesSchema = {
    hp: fields.SchemaField<ActorHitPointsSchema, fields.SourceFromSchema<ActorHitPointsSchema>, ActorHitPoints>;
    ac: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    hardness: fields.NumberField<number, number, true, false, true>;
    stealth: fields.SchemaField<{
        value: fields.NumberField<number, number, true, true, true>;
        details: fields.StringField<string, string, true, false, true>;
    }>;
    immunities: fields.ArrayField<
        fields.SchemaField<{
            type: fields.StringField<ImmunityType, ImmunityType, true, false, false>;
            exceptions: fields.ArrayField<fields.StringField<ImmunityType, ImmunityType, true, false, false>>;
        }>
    >;
    weaknesses: fields.ArrayField<
        fields.SchemaField<{
            type: fields.StringField<WeaknessType, WeaknessType, true, false, false>;
            value: fields.NumberField<number, number, true, false, true>;
            exceptions: fields.ArrayField<fields.StringField<WeaknessType, WeaknessType, true, false, false>>;
        }>
    >;
    resistances: fields.ArrayField<
        fields.SchemaField<{
            type: fields.StringField<ResistanceType, ResistanceType, true, false, false>;
            value: fields.NumberField<number, number, true, false, true>;
            exceptions: fields.ArrayField<fields.StringField<ResistanceType, ResistanceType, true, false, false>>;
            doubleVs: fields.ArrayField<fields.StringField<ResistanceType, ResistanceType, true, false, false>>;
        }>
    >;
    emitsSound: DataUnionField<
        | fields.StringField<"encounter", "encounter", true, false, false>
        | fields.BooleanField<boolean, boolean, true, false, false>,
        true,
        false,
        true
    >;
};

type HazardAttributesSource = fields.SourceFromSchema<HazardAttributesSchema>;

type HazardDetailsSchema = {
    description: fields.HTMLField;
    level: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    isComplex: fields.BooleanField<boolean, boolean, true, false, true>;
    disable: fields.StringField<string, string, true, false, true>;
    routine: fields.StringField<string, string, true, false, true>;
    reset: fields.StringField<string, string, true, false, true>;
    /** Information concerning the publication from which this actor originates */
    publication: PublicationField;
};

/** The raw information contained within the actor data object for hazards. */
interface HazardSystemSource extends fields.SourceFromSchema<HazardSystemSchema> {
    schema?: never;
}

interface HazardAttributes extends ActorAttributes, Omit<HazardAttributesSource, AttributesSourceOmission> {
    ac: {
        value: number;
    };
    hp: HazardHitPoints;
    hasHealth: boolean;
    stealth: HazardStealthTraceData;
    immunities: Immunity[];
    weaknesses: Weakness[];
    resistances: Resistance[];
    shield?: never;
}

type AttributesSourceOmission = "immunities" | "weaknesses" | "resistances";

interface HazardStealthTraceData extends Omit<StatisticTraceData, "dc" | "totalModifier" | "value"> {
    dc: number | null;
    totalModifier: number | null;
    value: number | null;
    details: string;
}

interface HazardDetails extends ActorDetails, fields.SourceFromSchema<HazardDetailsSchema> {
    alliance: null;
}

interface HazardHitPoints extends ActorHitPoints {
    brokenThreshold: number;
}

export { HazardSystemData, type HazardSource };
