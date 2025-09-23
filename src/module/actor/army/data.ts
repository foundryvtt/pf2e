import { ActorSystemSource, BaseActorSourcePF2e } from "@actor/data/base.ts";
import { Immunity, ImmunitySource, Resistance, ResistanceSource, Weakness, WeaknessSource } from "@actor/data/iwr.ts";
import { ActorSystemModel, ActorSystemSchema } from "@actor/data/model.ts";
import { InitiativeTraceData } from "@actor/initiative.ts";
import { ActorAlliance } from "@actor/types.ts";
import { RARITIES, Rarity, ValueAndMax } from "@module/data.ts";
import { AutoChangeEntry } from "@module/rules/rule-element/ae-like.ts";
import { PerceptionTraceData } from "@system/statistic/perception.ts";
import { ArmyPF2e } from "./document.ts";
import { ArmyType } from "./types.ts";
import { ARMY_STATS, ARMY_TYPES } from "./values.ts";
import fields = foundry.data.fields;

class ArmySystemData extends ActorSystemModel<ArmyPF2e, ArmySystemSchema> {
    static override defineSchema(): ArmySystemSchema {
        const parent = super.defineSchema();

        function createWeaponSchema(): ArmyWeaponSchema {
            return {
                name: new fields.StringField({ required: true, nullable: false }),
                potency: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
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
                    integer: true,
                    initial: (d: DeepPartial<ArmySystemSource>) =>
                        getLevelDefault(ARMY_STATS.ac, d.details?.level?.value),
                }),
                potency: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
            }),
            attributes: new fields.SchemaField({
                hp: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 4 }),
                    temp: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
                    max: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 4 }),
                    routThreshold: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: true,
                        initial: 2,
                    }),
                }),
            }),
            details: new fields.SchemaField({
                level: new fields.SchemaField({
                    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
                }),
                description: new fields.HTMLField({ required: true, nullable: false, initial: "" }),
            }),
            consumption: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
            scouting: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                initial: (d: DeepPartial<ArmySystemSource>) =>
                    getLevelDefault(ARMY_STATS.scouting, d.details?.level?.value),
            }),
            recruitmentDC: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 15 }),
            saves: new fields.SchemaField({
                maneuver: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    initial: (d: DeepPartial<ArmySystemSource>) =>
                        getLevelDefault(ARMY_STATS.strongSave, d.details?.level?.value),
                }),
                morale: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
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
                    value: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: true,
                        min: 0,
                        initial: 0,
                    }),
                }),
                potions: new fields.SchemaField({
                    value: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: true,
                        min: 0,
                        initial: 0,
                    }),
                }),
            }),
            traits: new fields.SchemaField({
                value: new fields.ArrayField(new fields.StringField({ required: true, nullable: false })),
                rarity: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: RARITIES,
                    initial: "common",
                }),
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

interface ArmySystemData
    extends ActorSystemModel<ArmyPF2e, ArmySystemSchema>,
        fields.ModelPropsFromSchema<ArmySystemSchema> {
    attributes: fields.ModelPropsFromSchema<ArmyAttributesSchema> & {
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
    details: fields.ModelPropsFromSchema<ArmyDetailsSchema> & {
        alliance: ActorAlliance;
    };
    perception: Pick<PerceptionTraceData, "senses">;
    traits: fields.ModelPropsFromSchema<ArmyTraitsSchema> & {
        size?: never;
    };
    resources: {
        ammunition: ValueAndMax;
        potions: ValueAndMax;
    } & Record<string, never>;
    /** An audit log of automatic, non-modifier changes applied to various actor data nodes */
    autoChanges: Record<string, AutoChangeEntry[] | undefined>;
}

type ArmySystemSchema = Omit<ActorSystemSchema, "attributes" | "traits" | "resources"> & {
    ac: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        potency: fields.NumberField<number, number, true, false, true>;
    }>;

    attributes: fields.SchemaField<ArmyAttributesSchema>;
    details: fields.SchemaField<ArmyDetailsSchema>;

    consumption: fields.NumberField<number, number, true, false, true>;
    scouting: fields.NumberField<number, number, true, false, true>;
    recruitmentDC: fields.NumberField<number, number, true, false, true>;

    saves: fields.SchemaField<{
        maneuver: fields.NumberField<number, number, true, false, true>;
        morale: fields.NumberField<number, number, true, false, true>;
    }>;

    weapons: fields.SchemaField<{
        ranged: fields.SchemaField<
            ArmyWeaponSchema,
            fields.SourceFromSchema<ArmyWeaponSchema>,
            fields.ModelPropsFromSchema<ArmyWeaponSchema>,
            true,
            true,
            true
        >;
        melee: fields.SchemaField<
            ArmyWeaponSchema,
            fields.SourceFromSchema<ArmyWeaponSchema>,
            fields.ModelPropsFromSchema<ArmyWeaponSchema>,
            true,
            true,
            true
        >;
    }>;

    resources: fields.SchemaField<{
        /** How often this army can use ranged attacks */
        ammunition: fields.SchemaField<{
            value: fields.NumberField<number, number, true, false, true>;
        }>;
        potions: fields.SchemaField<{
            value: fields.NumberField<number, number, true, false, true>;
        }>;
    }>;

    traits: fields.SchemaField<ArmyTraitsSchema>;
};

type ArmyAttributesSchema = {
    hp: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        temp: fields.NumberField<number, number, true, false, true>;
        max: fields.NumberField<number, number, true, false, true>;
        routThreshold: fields.NumberField<number, number, true, false, true>;
    }>;
};

type ArmyDetailsSchema = {
    level: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    description: fields.HTMLField;
};

type ArmyTraitsSchema = {
    value: fields.ArrayField<fields.StringField<string, string, true, false>>;
    rarity: fields.StringField<Rarity, Rarity, true, false>;
    type: fields.StringField<ArmyType, ArmyType, true, false>;
};

type ArmyWeaponSchema = {
    name: fields.StringField<string, string, true, false, false>;
    potency: fields.NumberField<number, number, true, false, true>;
};

interface ArmyAttributesSource extends fields.SourceFromSchema<ArmyAttributesSchema> {
    immunities?: ImmunitySource[];
    weaknesses?: WeaknessSource[];
    resistances?: ResistanceSource[];
    flanking?: never;
}

interface ArmyTraitSource extends fields.SourceFromSchema<ArmyTraitsSchema> {
    size?: never;
}

interface ArmySystemSource extends fields.SourceFromSchema<ArmySystemSchema> {
    attributes: ArmyAttributesSource;
    traits: ArmyTraitSource;
    /** Legacy location of `MigrationRecord` */
    schema?: ActorSystemSource["schema"];
}

type ArmySource = BaseActorSourcePF2e<"army", ArmySystemSource>;

export { ArmySystemData };
export type { ArmySource };
