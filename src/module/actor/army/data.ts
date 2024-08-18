import { ActorSystemSource, BaseActorSourcePF2e } from "@actor/data/base.ts";
import { Immunity, ImmunitySource, Resistance, ResistanceSource, Weakness, WeaknessSource } from "@actor/data/iwr.ts";
import { ActorSystemModel, ActorSystemSchema, ActorTraitsSchema } from "@actor/data/schema.ts";
import { InitiativeTraceData } from "@actor/initiative.ts";
import { ActorAlliance } from "@actor/types.ts";
import { Rarity } from "@module/data.ts";
import { AutoChangeEntry } from "@module/rules/rule-element/ae-like.ts";
import { PerceptionTraceData } from "@system/statistic/perception.ts";
import { NumberField, SchemaField, StringField } from "types/foundry/common/data/fields.js";
import { ArmyPF2e } from "./document.ts";
import { ArmyType } from "./types.ts";
import { ARMY_STATS, ARMY_TYPES } from "./values.ts";

const fields = foundry.data.fields;

class ArmySystemData extends ActorSystemModel<ArmyPF2e, ArmySystemSchema> {
    static override defineSchema(): ArmySystemSchema {
        const parent = super.defineSchema();

        function createWeaponSchema(): ArmyWeaponSchema {
            return {
                name: new fields.StringField({ required: true, nullable: false }),
                potency: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            };
        }

        function getLevelDefault(record: Record<number, number>, level: number | undefined) {
            return typeof level === "number" && level in record ? record[level] : record[1];
        }

        return {
            ...parent,
            ac: new fields.SchemaField({
                value: new fields.NumberField({
                    required: true,
                    nullable: false,
                    initial: (d: DeepPartial<ArmySystemSource>) =>
                        getLevelDefault(ARMY_STATS.ac, d.details?.level?.value),
                }),
                potency: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            }),
            attributes: new fields.SchemaField({
                hp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, initial: 4 }),
                    temp: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                    max: new fields.NumberField({ required: true, nullable: false, initial: 4 }),
                    routThreshold: new fields.NumberField({ required: true, nullable: false, initial: 2 }),
                }),
            }),
            details: new fields.SchemaField({
                level: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
                }),
            }),
            consumption: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
            scouting: new fields.NumberField({
                required: true,
                nullable: false,
                initial: (d: DeepPartial<ArmySystemSource>) =>
                    getLevelDefault(ARMY_STATS.scouting, d.details?.level?.value),
            }),
            recruitmentDC: new fields.NumberField(),
            saves: new fields.SchemaField({
                maneuver: new fields.NumberField({
                    required: true,
                    nullable: false,
                    initial: (d: DeepPartial<ArmySystemSource>) =>
                        getLevelDefault(ARMY_STATS.strongSave, d.details?.level?.value),
                }),
                morale: new fields.NumberField({
                    required: true,
                    nullable: false,
                    initial: (d: DeepPartial<ArmySystemSource>) =>
                        getLevelDefault(ARMY_STATS.weakSave, d.details?.level?.value),
                }),
            }),
            weapons: new fields.SchemaField({
                melee: new fields.SchemaField(createWeaponSchema(), { required: true, nullable: true, initial: null }),
                ranged: new fields.SchemaField(createWeaponSchema(), { required: true, nullable: true, initial: null }),
            }),
            resources: new fields.SchemaField({
                /** How often this army can use ranged attacks */
                ammunition: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                }),
                potions: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                }),
            }),
            traits: new fields.SchemaField({
                value: new fields.ArrayField(new fields.StringField({ required: true, nullable: false })),
                rarity: new fields.StringField({ required: true, nullable: false, initial: "common" }),
                type: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: ARMY_TYPES,
                    initial: "infantry",
                }),
            }),
        };
    }
}

interface ArmySystemData extends ActorSystemModel<ArmyPF2e, ArmySystemSchema>, ModelPropsFromSchema<ArmySystemSchema> {
    attributes: ModelPropsFromSchema<ArmyAttributesSchema> & {
        hp: {
            max: number;
            negativeHealing: boolean;
            unrecoverable: number;
            details: string;
        };
        immunities: Immunity[];
        weaknesses: Weakness[];
        resistances: Resistance[];
        flanking: never;
    };
    initiative: InitiativeTraceData;
    details: ModelPropsFromSchema<ArmyDetailsSchema> & {
        alliance: ActorAlliance;
    };
    perception: Pick<PerceptionTraceData, "senses">;
    traits: ModelPropsFromSchema<ArmyTraitsSchema> & {
        size?: never;
    };
    resources: ModelPropsFromSchema<ArmySystemSchema>["resources"] & {
        ammunition: { max: number };
        potions: { max: number };
    };
    /** An audit log of automatic, non-modifier changes applied to various actor data nodes */
    autoChanges: Record<string, AutoChangeEntry[] | undefined>;
}

type ArmySystemSchema = Omit<ActorSystemSchema, "attributes" | "traits" | "resources"> & {
    ac: SchemaField<{
        value: NumberField<number, number, true, false, true>;
        potency: NumberField<number, number, true, false, true>;
    }>;

    attributes: SchemaField<ArmyAttributesSchema>;
    details: SchemaField<ArmyDetailsSchema>;

    consumption: NumberField<number, number, true, false, true>;
    scouting: NumberField<number, number, true, false, true>;
    recruitmentDC: NumberField;

    saves: SchemaField<{
        maneuver: NumberField<number, number, true, false, true>;
        morale: NumberField<number, number, true, false, true>;
    }>;

    weapons: SchemaField<{
        ranged: SchemaField<
            ArmyWeaponSchema,
            SourceFromSchema<ArmyWeaponSchema>,
            ModelPropsFromSchema<ArmyWeaponSchema>,
            true,
            true,
            true
        >;
        melee: SchemaField<
            ArmyWeaponSchema,
            SourceFromSchema<ArmyWeaponSchema>,
            ModelPropsFromSchema<ArmyWeaponSchema>,
            true,
            true,
            true
        >;
    }>;

    resources: SchemaField<{
        /** How often this army can use ranged attacks */
        ammunition: SchemaField<{
            value: NumberField<number, number, true, false, true>;
        }>;
        potions: SchemaField<{
            value: NumberField<number, number, true, false, true>;
        }>;
    }>;

    traits: SchemaField<ArmyTraitsSchema>;
};

type ArmyAttributesSchema = {
    hp: SchemaField<{
        value: NumberField<number, number, true, false, true>;
        temp: NumberField<number, number, true, false, true>;
        max: NumberField<number, number, true, false, true>;
        routThreshold: NumberField<number, number, true, false, true>;
    }>;
};

type ArmyDetailsSchema = {
    level: SchemaField<{
        value: NumberField<number, number, true, false, true>;
    }>;
};

type ArmyTraitsSchema = ActorTraitsSchema<string> & {
    rarity: StringField<Rarity, Rarity, true, false>;
    type: StringField<ArmyType, ArmyType, true, false>;
};

type ArmyWeaponSchema = {
    name: StringField<string, string, true, false, false>;
    potency: NumberField<number, number, true, false, true>;
};

type ArmySystemSource = SourceFromSchema<ArmySystemSchema> & {
    attributes: {
        immunities?: ImmunitySource[];
        weaknesses?: WeaknessSource[];
        resistances?: ResistanceSource[];
        flanking: never;
        hp: {
            details: string;
        };
    };
    /** Legacy location of `MigrationRecord` */
    schema?: ActorSystemSource["schema"];
};

type ArmySource = BaseActorSourcePF2e<"army", ArmySystemSource>;

export { ArmySystemData };
export type { ArmySource };
