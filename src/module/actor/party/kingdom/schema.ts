import { ZeroToFour } from "@module/data.ts";
import * as R from "remeda";
import { ArrayField, StringField } from "types/foundry/common/data/fields.js";
import { KingdomAbility } from "./data.ts";
import { KINGDOM_ABILITIES, KINGDOM_COMMODITIES, KINGDOM_LEADERSHIP, KINGDOM_SKILLS } from "./values.ts";

const { fields } = foundry.data;

function buildKingdomCHGSchema(): {
    name: StringField<string, string, true, false>;
    img: StringField<ImageFilePath, ImageFilePath, true, false>;
    description: StringField<string, string, true, false>;
    boosts: ArrayField<StringField<KingdomAbility | "free", KingdomAbility | "free", true, false>>;
    flaw: StringField<KingdomAbility, KingdomAbility, true, true>;
} {
    return {
        name: new fields.StringField({ blank: false, nullable: false }),
        img: new fields.StringField({ required: true, nullable: false }),
        description: new fields.StringField({ required: true, nullable: false }),
        boosts: new fields.ArrayField(
            new fields.StringField({ choices: [...KINGDOM_ABILITIES, "free"], nullable: false })
        ),
        flaw: new fields.StringField({ choices: KINGDOM_ABILITIES, required: true, nullable: true }),
    };
}

const KINGDOM_BUILD_SCHEMA = {
    /** Determines if the ability scores are manually set or automatically determined. */
    manual: new fields.BooleanField<boolean, boolean>({ required: true, nullable: false, initial: false }),
    charter: new fields.SchemaField(buildKingdomCHGSchema(), { nullable: true, initial: null }),
    heartland: new fields.SchemaField(buildKingdomCHGSchema(), { nullable: true, initial: null }),
    government: new fields.SchemaField(
        {
            ...buildKingdomCHGSchema(),
            skills: new fields.ArrayField<StringField<string, string, true, false>>(
                new fields.StringField({ required: true, nullable: false })
            ),
        },
        { nullable: true, initial: null }
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
        })
    ),
    /** Boost selections made by the user, both during the build process and levelling */
    boosts: new fields.SchemaField(
        R.mapToObj(["charter", "heartland", "government", "1", "5", "10", "15", "20"] as const, (category) => {
            const schema = new fields.ArrayField<StringField<KingdomAbility, KingdomAbility, true, false>>(
                new fields.StringField<KingdomAbility, KingdomAbility, true, false>({
                    choices: KINGDOM_ABILITIES,
                    nullable: false,
                })
            );

            return [category, schema];
        })
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
        value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        max: new fields.NumberField({ required: true, nullable: false, initial: 3 }),
    }),
    commodities: new fields.SchemaField(
        R.mapToObj(KINGDOM_COMMODITIES, (type) => {
            const schema = new fields.SchemaField({
                value: new fields.NumberField<number, number, true>({ required: true, initial: 0 }),
                max: new fields.NumberField<number, number, true>({ required: true, initial: 0 }),
                sites: new fields.NumberField<number, number, true, false>({
                    required: true,
                    nullable: false,
                    min: 0,
                    initial: 0,
                }),
                resourceSites: new fields.NumberField<number, number, true, false>({
                    required: true,
                    nullable: false,
                    min: 0,
                    initial: 0,
                }),
            });

            return [type, schema];
        })
    ),
};

const KINGDOM_SCHEMA = {
    type: new fields.StringField({
        choices: ["kingmaker"],
        required: true,
        nullable: false,
        initial: "kingmaker",
    }),

    name: new fields.StringField<string, string, true, false>({ required: true, nullable: false, initial: "" }),
    img: new fields.StringField({ required: true, nullable: false }),
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
    active: new fields.BooleanField<boolean, boolean, true, false>({ initial: false, required: true, nullable: false }),
    aspiration: new fields.StringField({
        choices: ["fame", "infamy"],
        required: true,
        nullable: false,
        initial: "fame",
    }),
    abilities: new fields.SchemaField(
        R.mapToObj(KINGDOM_ABILITIES, (ability) => {
            const schema = new fields.SchemaField({
                value: new fields.NumberField<number, number, true, false>({
                    initial: 10,
                    required: true,
                    nullable: false,
                }),
                mod: new fields.NumberField<number, number, true, false>({
                    initial: 0,
                    required: true,
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
                penalty: new fields.NumberField<number, number, true, false>({
                    initial: 0,
                    required: true,
                    nullable: false,
                }),
            });

            return [ability, schema];
        })
    ),
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
        })
    ),
    build: new fields.SchemaField(KINGDOM_BUILD_SCHEMA),
    resources: new fields.SchemaField(KINGDOM_RESOURCES_SCHEMA),
};

export { KINGDOM_SCHEMA };
