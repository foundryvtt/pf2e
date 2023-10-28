import { ZeroToFour } from "@module/data.ts";
import * as R from "remeda";
import type { ArrayField, SchemaField, StringField } from "types/foundry/common/data/fields.d.ts";
import { KingdomAbility, KingdomSettlementData, KingdomSettlementType, KingdomSkill } from "./types.ts";
import {
    KINGDOM_ABILITIES,
    KINGDOM_COMMODITIES,
    KINGDOM_LEADERSHIP,
    KINGDOM_SETTLEMENT_TYPES,
    KINGDOM_SKILLS,
} from "./values.ts";
import { RawModifier } from "@actor/modifiers.ts";
import { DataUnionField, RecordField, StrictBooleanField, StrictStringField } from "@system/schema-data-fields.ts";

const { fields } = foundry.data;

function buildKingdomCHGSchema(): {
    id: StringField<string, string, false, false>;
    name: StringField<string, string, true, false>;
    img: StringField<ImageFilePath, ImageFilePath, true, false>;
    description: StringField<string, string, true, false>;
    boosts: ArrayField<StringField<KingdomAbility | "free", KingdomAbility | "free", true, false>>;
} {
    return {
        id: new fields.StringField({ required: false, initial: undefined, blank: false }),
        name: new fields.StringField({ required: true, nullable: false, blank: false }),
        img: new fields.StringField({ required: true, nullable: false }),
        description: new fields.StringField({ required: true, nullable: false }),
        boosts: new fields.ArrayField(
            new fields.StringField({ choices: [...KINGDOM_ABILITIES, "free"], nullable: false }),
        ),
    };
}

const KINGDOM_BUILD_SCHEMA = {
    /** Determines if the ability scores are manually set or automatically determined. */
    manual: new fields.BooleanField<boolean, boolean>({ required: true, nullable: false, initial: false }),
    charter: new fields.SchemaField(
        {
            ...buildKingdomCHGSchema(),
            flaw: new fields.StringField<KingdomAbility, KingdomAbility, true, true>({
                choices: KINGDOM_ABILITIES,
                required: true,
                nullable: true,
            }),
        },
        { nullable: true, initial: null },
    ),
    heartland: new fields.SchemaField(buildKingdomCHGSchema(), { nullable: true, initial: null }),
    government: new fields.SchemaField(
        {
            ...buildKingdomCHGSchema(),
            skills: new fields.ArrayField<StringField<KingdomSkill, KingdomSkill, true, false>>(
                new fields.StringField({ required: true, nullable: false, choices: KINGDOM_SKILLS }),
            ),
            feat: new fields.StringField<CompendiumUUID, CompendiumUUID, true, true>({
                required: true,
                nullable: true,
            }),
        },
        { nullable: true, initial: null },
    ),
    skills: new fields.SchemaField(
        R.mapToObj(KINGDOM_SKILLS, (skill) => {
            const schema = new fields.SchemaField({
                rank: new fields.NumberField<ZeroToFour, ZeroToFour, true, false>({
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
            const schema = new fields.ArrayField<StringField<KingdomAbility, KingdomAbility, true, false>>(
                new fields.StringField<KingdomAbility, KingdomAbility, true, false>({
                    choices: KINGDOM_ABILITIES,
                    nullable: false,
                }),
            );

            return [category, schema];
        }),
    ),
};

const KINGDOM_RESOURCES_SCHEMA = {
    dice: new fields.SchemaField({
        number: new fields.NumberField<number, number>(),
        faces: new fields.NumberField<number, number>(),
        bonus: new fields.NumberField<number, number, true, false>({ required: true, nullable: false, initial: 0 }),
        penalty: new fields.NumberField<number, number, true, false>({ required: true, nullable: false, initial: 0 }),
    }),
    fame: new fields.SchemaField({
        value: new fields.NumberField<number, number, true, false>({ required: true, nullable: false, initial: 0 }),
        max: new fields.NumberField<number, number, true, false>({ required: true, nullable: false, initial: 3 }),
    }),
    commodities: new fields.SchemaField(
        R.mapToObj(KINGDOM_COMMODITIES, (type) => {
            const schema = new fields.SchemaField({
                value: new fields.NumberField<number, number, true, false>({
                    required: true,
                    nullable: false,
                    initial: 0,
                }),
                max: new fields.NumberField<number, number, true, false>({
                    required: true,
                    nullable: false,
                    initial: 0,
                }),
            });

            return [type, schema];
        }),
    ),
    points: new fields.NumberField<number, number, false, false, true>({
        min: 0,
        required: false,
        nullable: false,
        initial: 0,
    }),
    /** Worksites by commodity type, for the commodities that can have work sites */
    workSites: new fields.SchemaField(
        R.mapToObj(["food", "luxuries", "lumber", "ore", "stone"], (type) => {
            const schema = new fields.SchemaField({
                /** The number of regular non-resource work sites */
                value: new fields.NumberField<number, number, false, false>({
                    required: false,
                    nullable: false,
                    min: 0,
                    initial: 0,
                }),
                /** The number of worksites that are on resource hexes (these grant double) */
                resource: new fields.NumberField<number, number, false, false>({
                    required: false,
                    nullable: false,
                    min: 0,
                    initial: 0,
                }),
            });

            return [type, schema];
        }),
    ),
};

const KINGDOM_SETTLEMENT_SCHEMA = {
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
    description: new fields.StringField<string, string, false, false, true>({
        required: false,
        nullable: false,
        blank: true,
        initial: "",
    }),
    sort: new fields.IntegerSortField(),
    consumption: new fields.SchemaField({
        base: new fields.NumberField<number, number, false, false>({ required: false, nullable: false, initial: 0 }),
        /** Some settlements reduce consumption, this is the number of reductions that may exist */
        reduction: new fields.NumberField<number, number, false, false>({
            required: false,
            nullable: false,
            initial: 0,
        }),
        total: new fields.NumberField<number, number, false, false>({ required: false, nullable: false, initial: 0 }),
    }),
    storage: new fields.SchemaField(
        R.mapToObj(["food", "luxuries", "lumber", "ore", "stone"], (type) => {
            const schema = new fields.NumberField<number, number, false, false>({
                required: false,
                nullable: false,
                min: 0,
                initial: 0,
            });
            return [type, schema];
        }),
    ),
};

const KINGDOM_SCHEMA = {
    type: new fields.StringField({
        choices: ["kingmaker"],
        required: true,
        nullable: false,
        initial: "kingmaker",
    }),
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
    name: new fields.StringField<string, string, true, false>({ required: true, nullable: false, initial: "" }),
    img: new fields.FilePathField<ImageFilePath, ImageFilePath, true, false>({
        categories: ["IMAGE"],
        required: true,
        nullable: false,
        initial: "systems/pf2e/icons/default-icons/kingdom.svg",
    }),
    capital: new fields.StringField({ initial: "", required: true }),
    size: new fields.NumberField<number, number, true, false>({ initial: 1, min: 1, required: true, nullable: false }),
    level: new fields.NumberField<number, number, true, false>({
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
                value: new fields.NumberField<number, number, false, false>({
                    initial: 10,
                    required: false,
                    nullable: false,
                }),
                mod: new fields.NumberField<number, number, false, false>({
                    initial: 0,
                    required: false,
                    nullable: false,
                }),
                ruin: new fields.SchemaField({
                    value: new fields.NumberField<number, number, true, false>({
                        required: true,
                        nullable: false,
                        initial: 0,
                    }),
                    max: new fields.NumberField<number, number, true, false>({
                        required: true,
                        nullable: false,
                        initial: 10,
                    }),
                }),
                // todo: see if this goes away once we wire it up
                penalty: new fields.NumberField<number, number, false, false>({
                    initial: 0,
                    required: false,
                    nullable: false,
                }),
            });

            return [ability, schema];
        }),
    ),
    build: new fields.SchemaField(KINGDOM_BUILD_SCHEMA),
    customModifiers: new fields.ObjectField<Record<string, RawModifier[]>>({ initial: {} }),
    leadership: new fields.SchemaField(
        R.mapToObj(KINGDOM_LEADERSHIP, (role) => {
            const schema = new fields.SchemaField({
                uuid: new fields.StringField<string, string, false, true>({
                    required: false,
                    nullable: true,
                    initial: null,
                }),
                vacant: new fields.BooleanField<boolean>({ initial: true }),
                invested: new fields.BooleanField<boolean, boolean, false>({ required: false, initial: false }),
            });

            return [role, schema];
        }),
    ),
    resources: new fields.SchemaField(KINGDOM_RESOURCES_SCHEMA),
    /** A collection of settlements controlled by this kingdom, and its related data */
    settlements: new RecordField<
        StringField<string, string, true, false, false>,
        SchemaField<
            typeof KINGDOM_SETTLEMENT_SCHEMA,
            SourceFromSchema<typeof KINGDOM_SETTLEMENT_SCHEMA>,
            KingdomSettlementData
        >,
        false,
        false
    >(
        new fields.StringField({ required: true, nullable: false, blank: false }),
        new fields.SchemaField(KINGDOM_SETTLEMENT_SCHEMA, { required: true }),
        { required: false, nullable: false, initial: {} },
    ),
    consumption: new fields.SchemaField({
        base: new fields.NumberField<number, number, false, false>({ required: false, nullable: false, initial: 0 }),
        settlement: new fields.NumberField<number, number, false, false>({ min: 0, initial: 0 }),
        army: new fields.NumberField<number, number, false, false>({ min: 0, initial: 0 }),
        value: new fields.NumberField<number, number, false, false>({ min: 0, initial: 0 }),
    }),
    unrest: new fields.SchemaField({
        value: new fields.NumberField<number, number, false, false, true>({
            integer: true,
            min: 0,
            max: 99,
            required: false,
            nullable: false,
            initial: 0,
        }),
        anarchyThreshold: new fields.NumberField<number, number, false, false, true>({
            integer: true,
            required: false,
            nullable: false,
            initial: 20,
        }),
    }),

    event: new fields.SchemaField({
        dc: new fields.NumberField<number, number, false, false>({
            required: false,
            nullable: false,
            min: 0,
            max: 20,
            initial: 16,
        }),
        text: new fields.StringField<string, string, false, false, true>({
            required: false,
            nullable: false,
            blank: true,
            initial: "",
        }),
    }),
    /** Any kingmaker specific module configuration and tweaks. Not used otherwise */
    module: new fields.ObjectField({ required: false, initial: {} }),
};

export { KINGDOM_SCHEMA, KINGDOM_SETTLEMENT_SCHEMA };
