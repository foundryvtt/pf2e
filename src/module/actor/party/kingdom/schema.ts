import type { RawModifier } from "@actor/modifiers.ts";
import type { DataSchema } from "@common/abstract/_types.d.mts";
import type { ImageFilePath } from "@common/constants.d.mts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import type { ZeroToFour } from "@module/data.ts";
import { DataUnionField, RecordField, StrictBooleanField, StrictStringField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import type {
    FameType,
    KingdomAbility,
    KingdomBoostCategory,
    KingdomCommodity,
    KingdomLeadershipRole,
    KingdomSettlementType,
    KingdomSkill,
} from "./types.ts";
import {
    KINGDOM_ABILITIES,
    KINGDOM_COMMODITIES,
    KINGDOM_LEADERSHIP,
    KINGDOM_SETTLEMENT_TYPES,
    KINGDOM_SKILLS,
} from "./values.ts";
import fields = foundry.data.fields;

function defineKingdomSchema(): KingdomSchema {
    const defineCHGSchema = (): CHGSchema => ({
        id: new fields.StringField({ required: false, initial: undefined, blank: false }),
        name: new fields.StringField({ required: true, nullable: false, blank: false }),
        img: new fields.StringField({ required: true, nullable: false }),
        description: new fields.StringField({ required: true, nullable: false }),
        boosts: new fields.ArrayField(
            new fields.StringField({ choices: [...KINGDOM_ABILITIES, "free"], nullable: false }),
        ),
    });

    const KINGDOM_BUILD_SCHEMA: BuildSchema = {
        /** Determines if the ability scores are manually set or automatically determined. */
        manual: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        charter: new fields.SchemaField(
            {
                ...defineCHGSchema(),
                flaw: new fields.StringField<KingdomAbility, KingdomAbility, true, true>({
                    choices: KINGDOM_ABILITIES,
                    required: true,
                    nullable: true,
                }),
            },
            { nullable: true, initial: null },
        ),
        heartland: new fields.SchemaField(defineCHGSchema(), { nullable: true, initial: null }),
        government: new fields.SchemaField(
            {
                ...defineCHGSchema(),
                skills: new fields.ArrayField<fields.StringField<KingdomSkill, KingdomSkill, true, false>>(
                    new fields.StringField({ required: true, nullable: false, choices: KINGDOM_SKILLS }),
                ),
                feat: new fields.DocumentUUIDField({ required: true, nullable: true }),
            },
            { nullable: true, initial: null },
        ),
        skills: new fields.SchemaField(
            R.mapToObj(KINGDOM_SKILLS, (skill) => {
                const schema = new fields.SchemaField({
                    rank: new fields.NumberField<ZeroToFour, ZeroToFour, true, false, true>({
                        initial: 0,
                        min: 0,
                        max: 4,
                        required: true,
                        nullable: false,
                    }),
                });

                return [skill, schema];
            }),
        ),
        /** Boost selections made by the user, both during the build process and levelling */
        boosts: new fields.SchemaField(
            R.mapToObj(["charter", "heartland", "government", "1", "5", "10", "15", "20"] as const, (category) => {
                const schema = new fields.ArrayField<fields.StringField<KingdomAbility, KingdomAbility, true, false>>(
                    new fields.StringField<KingdomAbility, KingdomAbility, true, false>({
                        choices: KINGDOM_ABILITIES,
                        nullable: false,
                    }),
                );

                return [category, schema];
            }),
        ),
    };

    const KINGDOM_RESOURCES_SCHEMA: ResourceSchema = {
        dice: new fields.SchemaField({
            number: new fields.NumberField(),
            faces: new fields.NumberField(),
            bonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            penalty: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        }),
        fame: new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            max: new fields.NumberField({ required: true, nullable: false, initial: 3 }),
        }),
        commodities: new fields.SchemaField(
            R.mapToObj(KINGDOM_COMMODITIES, (type) => {
                const schema = new fields.SchemaField({
                    value: new fields.NumberField<number, number, true, false, true>({
                        required: true,
                        nullable: false,
                        initial: 0,
                    }),
                    max: new fields.NumberField<number, number, true, false, true>({
                        required: true,
                        nullable: false,
                        initial: 0,
                    }),
                });

                return [type, schema];
            }),
        ),
        points: new fields.NumberField({ min: 0, required: true, nullable: false, initial: 0 }),
        /** Worksites by commodity type, for the commodities that can have work sites */
        workSites: new fields.SchemaField(
            R.mapToObj(["food", "luxuries", "lumber", "ore", "stone"], (type) => {
                const schema = new fields.SchemaField({
                    /** The number of regular non-resource work sites */
                    value: new fields.NumberField<number, number, true, false, true>({
                        required: true,
                        nullable: false,
                        min: 0,
                        initial: 0,
                    }),
                    /** The number of worksites that are on resource hexes (these grant double) */
                    resource: new fields.NumberField<number, number, true, false, true>({
                        required: true,
                        nullable: false,
                        min: 0,
                        initial: 0,
                    }),
                });

                return [type, schema];
            }),
        ),
    };

    const KINGDOM_SETTLEMENT_SCHEMA: SettlementSchema = {
        name: new fields.StringField<string, string, true, false, true>({
            required: true,
            blank: true,
            nullable: false,
            initial: "",
        }),
        type: new fields.StringField<KingdomSettlementType, KingdomSettlementType, false, false, true>({
            required: false,
            nullable: false,
            choices: KINGDOM_SETTLEMENT_TYPES,
            initial: "village",
        }),
        level: new fields.NumberField({ min: 1, initial: 1, max: 30, nullable: false }),
        overcrowded: new fields.BooleanField(),
        description: new fields.StringField({ required: true, nullable: false, blank: true, initial: "" }),
        sort: new fields.IntegerSortField(),
        consumption: new fields.SchemaField({
            base: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            /** Some settlements reduce consumption, this is the number of reductions that may exist */
            reduction: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            total: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        }),
        storage: new fields.SchemaField(
            R.mapToObj(["food", "luxuries", "lumber", "ore", "stone"], (type) => {
                const schema = new fields.NumberField<number, number, true, false, true>({
                    required: true,
                    nullable: false,
                    integer: true,
                    min: 0,
                    initial: 0,
                });
                return [type, schema];
            }),
        ),
    };

    return {
        type: new fields.StringField({ choices: ["kingmaker"], required: true, nullable: false, initial: "kingmaker" }),
        active: new DataUnionField(
            [
                new StrictStringField<"building">({
                    required: false,
                    nullable: false,
                    choices: ["building"],
                    initial: undefined,
                }),
                new StrictBooleanField({ initial: false, required: false, nullable: false }),
            ],
            { required: false, nullable: false, initial: false },
        ),
        name: new fields.StringField<string, string, true, false>({
            required: true,
            nullable: false,
            blank: false,
            initial: () => game.i18n.localize("PF2E.TraitKingdom"),
        }),
        img: new fields.FilePathField<ImageFilePath, ImageFilePath, true, false>({
            categories: ["IMAGE"],
            required: true,
            nullable: false,
            initial: `${SYSTEM_ROOT}/icons/default-icons/kingdom.svg`,
        }),
        capital: new fields.StringField({ initial: "", required: true }),
        size: new fields.NumberField({ initial: 1, min: 1, required: true, nullable: false }),
        level: new fields.NumberField({
            required: true,
            nullable: false,
            min: 1,
            max: 20,
            initial: 1,
        }),
        xp: new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            max: new fields.NumberField({
                required: true,
                nullable: false,
                initial: 1000,
            }),
        }),
        aspiration: new fields.StringField({
            choices: ["fame", "infamy"],
            required: true,
            nullable: false,
            initial: "fame",
        }),
        abilities: new fields.SchemaField(
            R.mapToObj(KINGDOM_ABILITIES, (ability) => {
                const schema = new fields.SchemaField({
                    value: new fields.NumberField<number, number, true, false, true>({
                        initial: 10,
                        required: true,
                        nullable: false,
                    }),
                    mod: new fields.NumberField<number, number, true, false, true>({
                        initial: 0,
                        required: true,
                        nullable: false,
                    }),
                    ruin: new fields.SchemaField<RuinSchema>({
                        value: new fields.NumberField<number, number, true, false, true>({
                            required: true,
                            nullable: false,
                            initial: 0,
                        }),
                        max: new fields.NumberField<number, number, true, false, true>({
                            required: true,
                            nullable: false,
                            initial: 10,
                        }),
                    }),
                    // todo: see if this goes away once we wire it up
                    penalty: new fields.NumberField<number, number, true, false, true>({
                        initial: 0,
                        required: true,
                        nullable: false,
                    }),
                });

                return [ability, schema];
            }),
        ),
        build: new fields.SchemaField(KINGDOM_BUILD_SCHEMA),
        customModifiers: new fields.ObjectField<Record<string, RawModifier[]>>(),
        leadership: new fields.SchemaField(
            R.mapToObj(KINGDOM_LEADERSHIP, (role) => {
                const schema = new fields.SchemaField<LeadershipSchema>({
                    uuid: new fields.DocumentUUIDField({ required: true, nullable: true, initial: null }),
                    vacant: new fields.BooleanField({ initial: true }),
                    invested: new fields.BooleanField(),
                });
                return [role, schema];
            }),
        ),
        resources: new fields.SchemaField(KINGDOM_RESOURCES_SCHEMA),
        /** A collection of settlements controlled by this kingdom, and its related data */
        settlements: new RecordField(
            new fields.StringField({ required: true, nullable: false, blank: false }),
            new fields.SchemaField(KINGDOM_SETTLEMENT_SCHEMA, { required: true }),
            { required: true, nullable: false },
        ),
        consumption: new fields.SchemaField({
            settlement: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
            army: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
            value: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
            breakdown: new fields.StringField(),
        }),
        unrest: new fields.SchemaField({
            value: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                max: 99,
                initial: 0,
            }),
            anarchyThreshold: new fields.NumberField({ integer: true, required: true, nullable: false, initial: 20 }),
        }),
        event: new fields.SchemaField({
            dc: new fields.NumberField({ required: true, nullable: false, min: 0, max: 20, initial: 16 }),
            text: new fields.StringField({ required: true, nullable: false, blank: true, initial: "" }),
        }),
        /** Any kingmaker specific module configuration and tweaks. Not used otherwise */
        module: new fields.ObjectField({ required: true }),
    };
}

type CHGSchema = {
    id: fields.StringField<string, string, false, false>;
    name: fields.StringField<string, string, true, false>;
    img: fields.StringField<ImageFilePath, ImageFilePath, true, false>;
    description: fields.StringField<string, string, true, false>;
    boosts: fields.ArrayField<fields.StringField<KingdomAbility | "free", KingdomAbility | "free", true, false>>;
};

type CharterSchema = CHGSchema & {
    flaw: fields.StringField<KingdomAbility, KingdomAbility, true, true>;
};
type GovernmentSchema = CHGSchema & {
    skills: fields.ArrayField<fields.StringField<KingdomSkill, KingdomSkill, true, false>>;
    feat: fields.DocumentUUIDField<ItemUUID>;
};

type NullableSchemaField<TSchema extends DataSchema> = fields.SchemaField<
    TSchema,
    fields.SourceFromSchema<TSchema>,
    fields.ModelPropsFromSchema<TSchema>,
    true,
    true,
    true
>;

type BuildSchema = {
    /** Determines if the ability scores are manually set or automatically determined. */
    manual: fields.BooleanField;
    charter: NullableSchemaField<CharterSchema>;
    heartland: NullableSchemaField<CHGSchema>;
    government: NullableSchemaField<GovernmentSchema>;
    skills: fields.SchemaField<
        Record<
            KingdomSkill,
            fields.SchemaField<{
                rank: fields.NumberField<ZeroToFour, ZeroToFour, true, false, true>;
            }>
        >
    >;
    /** Boost selections made by the user, both during the build process and levelling */
    boosts: fields.SchemaField<
        Record<KingdomBoostCategory, fields.ArrayField<fields.StringField<KingdomAbility, KingdomAbility, true, false>>>
    >;
};

type ResourceSchema = {
    dice: fields.SchemaField<{
        number: fields.NumberField;
        faces: fields.NumberField;
        bonus: fields.NumberField<number, number, true, false, true>;
        penalty: fields.NumberField<number, number, true, false, true>;
    }>;
    fame: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        max: fields.NumberField<number, number, true, false, true>;
    }>;
    commodities: fields.SchemaField<
        Record<
            KingdomCommodity,
            fields.SchemaField<{
                value: fields.NumberField<number, number, true, false, true>;
                max: fields.NumberField<number, number, true, false, true>;
            }>
        >
    >;
    points: fields.NumberField<number, number, true, false, true>;
    /** Worksites by commodity type, for the commodities that can have work sites */
    workSites: fields.SchemaField<
        Record<
            KingdomCommodity,
            fields.SchemaField<{
                /** The number of regular non-resource work sites */
                value: fields.NumberField<number, number, true, false, true>;
                /** The number of worksites that are on resource hexes (these grant double) */
                resource: fields.NumberField<number, number, true, false, true>;
            }>
        >
    >;
};

type SettlementSchema = {
    name: fields.StringField<string, string, true, false, true>;
    type: fields.StringField<KingdomSettlementType, KingdomSettlementType, false, false, true>;
    level: fields.NumberField<number, number, true, false, true>;
    overcrowded: fields.BooleanField;
    description: fields.StringField<string, string, true, false, true>;
    sort: fields.IntegerSortField;
    consumption: fields.SchemaField<{
        base: fields.NumberField<number, number, true, false, true>;
        /** Some settlements reduce consumption, this is the number of reductions that may exist */
        reduction: fields.NumberField<number, number, true, false, true>;
        total: fields.NumberField<number, number, true, false, true>;
    }>;
    storage: fields.SchemaField<Record<KingdomCommodity, fields.NumberField<number, number, true, false, true>>>;
};

type LeadershipSchema = {
    uuid: fields.DocumentUUIDField<ItemUUID>;
    vacant: fields.BooleanField;
    invested: fields.BooleanField;
};
type RuinSchema = {
    value: fields.NumberField<number, number, true, false, true>;
    max: fields.NumberField<number, number, true, false, true>;
};

type KingdomSchema = {
    type: fields.StringField<"kingmaker", "kingmaker", true, false, true>;
    active: DataUnionField<
        StrictStringField<"building", "building", false, false, boolean> | StrictBooleanField<boolean, boolean, true>,
        false,
        false,
        boolean
    >;
    name: fields.StringField<string, string, true, false, true>;
    img: fields.FilePathField<ImageFilePath, ImageFilePath, true, false, true>;
    capital: fields.StringField<string, string, true, false, true>;
    size: fields.NumberField<number, number, true, false, true>;
    level: fields.NumberField<number, number, true, false, true>;
    xp: fields.SchemaField<
        {
            value: fields.NumberField<number, number, true, false, true>;
            max: fields.NumberField<number, number, true, false, true>;
        },
        { value: number; max: number },
        { value: number; max: number },
        true,
        false,
        true
    >;
    aspiration: fields.StringField<FameType, FameType, true, false, true>;
    abilities: fields.SchemaField<{
        [key in KingdomAbility]: fields.SchemaField<{
            value: fields.NumberField<number, number, true, false, true>;
            mod: fields.NumberField<number, number, true, false, true>;
            ruin: fields.SchemaField<RuinSchema>;
            penalty: fields.NumberField<number, number, true, false, true>;
        }>;
    }>;
    build: fields.SchemaField<BuildSchema>;
    customModifiers: fields.ObjectField<Record<string, RawModifier[]>>;
    leadership: fields.SchemaField<Record<KingdomLeadershipRole, fields.SchemaField<LeadershipSchema>>>;
    resources: fields.SchemaField<ResourceSchema>;
    /** A collection of settlements controlled by this kingdom, and its related data */
    settlements: RecordField<
        fields.StringField<string, string, true, false, false>,
        fields.SchemaField<SettlementSchema>
    >;
    consumption: fields.SchemaField<{
        settlement: fields.NumberField<number, number, true, false, true>;
        army: fields.NumberField<number, number, true, false, true>;
        value: fields.NumberField<number, number, true, false, true>;
        breakdown: fields.StringField;
    }>;
    unrest: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        anarchyThreshold: fields.NumberField<number, number, true, false, true>;
    }>;
    event: fields.SchemaField<{
        dc: fields.NumberField<number, number, true, false, true>;
        text: fields.StringField<string, string, true, false, true>;
    }>;
    /** Any kingmaker specific module configuration and tweaks. Not used otherwise */
    module: fields.ObjectField<object>;
};

interface KingdomCHG extends fields.ModelPropsFromSchema<CHGSchema> {
    feat?: ItemUUID | null;
    flaw?: KingdomAbility | null;
}

interface KingdomCharter extends KingdomCHG {
    feat?: never;
    flaw: KingdomAbility | null;
}

interface KingdomHeartland extends fields.ModelPropsFromSchema<CHGSchema> {
    feat?: never;
    flaw?: never;
}

interface KingdomGovernment extends fields.ModelPropsFromSchema<GovernmentSchema> {
    skills: KingdomSkill[];
    feat: ItemUUID | null;
    flaw?: never;
}

interface KingdomBuildData extends fields.ModelPropsFromSchema<BuildSchema> {
    charter: KingdomCharter | null;
    heartland: KingdomHeartland | null;
    government: KingdomGovernment | null;
}

interface KingdomData extends fields.ModelPropsFromSchema<KingdomSchema> {
    build: KingdomBuildData;
}

type KingdomAbilityData = KingdomData["abilities"][KingdomAbility];

type KingdomLeadershipData = KingdomData["leadership"][KingdomLeadershipRole];
type KingdomSettlementData = fields.ModelPropsFromSchema<SettlementSchema>;
type KingdomSource = fields.SourceFromSchema<KingdomSchema>;

export { defineKingdomSchema };
export type {
    KingdomAbilityData,
    KingdomBuildData,
    KingdomCharter,
    KingdomCHG,
    KingdomData,
    KingdomGovernment,
    KingdomHeartland,
    KingdomLeadershipData,
    KingdomSchema,
    KingdomSettlementData,
    KingdomSource,
};
