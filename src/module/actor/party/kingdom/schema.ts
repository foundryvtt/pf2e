import { ActorPF2e } from "@actor";
import { ArrayField, StringField } from "types/foundry/common/data/fields.js";
import { KingdomAbility } from "./data.ts";
import { mapValuesFromKeys } from "./helpers.ts";
import { KINGDOM_ABILITIES, KINGDOM_COMMODITIES, KINGDOM_LEADERSHIP } from "./values.ts";

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
    boosts: new fields.SchemaField(
        mapValuesFromKeys(["charter", "heartland", "government", "1", "5", "10", "15", "20"] as const, () => {
            return new fields.ArrayField<StringField<KingdomAbility, KingdomAbility, true, false>>(
                new fields.StringField<KingdomAbility, KingdomAbility, true, false>({
                    choices: KINGDOM_ABILITIES,
                    nullable: false,
                })
            );
        })
    ),
};

const KINGDOM_RESOURCES_SCHEMA = {
    fame: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        max: new fields.NumberField({ required: true, nullable: false, initial: 3 }),
    }),
    commodities: new fields.SchemaField(
        mapValuesFromKeys(KINGDOM_COMMODITIES, () => {
            return new fields.SchemaField({
                value: new fields.NumberField({ required: true, initial: 0 }),
                max: new fields.NumberField({ required: true, initial: 0 }),
                maxBase: new fields.NumberField({ required: false, nullable: true }),
                maxExtra: new fields.NumberField({ required: true, initial: 0 }),
            });
        })
    ),
};

const KINGDOM_SCHEMA = {
    type: new fields.StringField({
        initial: "kingmaker",
        required: true,
        nullable: false,
    }),
    capital: new fields.StringField({ initial: "", required: true }),
    size: new fields.NumberField({ initial: 1, required: true, nullable: false }),
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
    abilities: new fields.SchemaField(
        mapValuesFromKeys(KINGDOM_ABILITIES, () => {
            return new fields.SchemaField({
                value: new fields.NumberField<number, number, true, false>({
                    initial: 10,
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
        })
    ),
    leadership: new fields.SchemaField(
        mapValuesFromKeys(KINGDOM_LEADERSHIP, () => {
            return new fields.SchemaField({
                img: new fields.FilePathField({ categories: ["IMAGE"], initial: () => ActorPF2e.DEFAULT_ICON }),
                name: new fields.StringField<string, string, false>({
                    required: false,
                    nullable: true,
                    blank: false,
                    initial: null,
                }),
                vacant: new fields.BooleanField<boolean>({ initial: true }),
                invested: new fields.BooleanField<boolean, boolean, false>({ required: false, initial: false }),
            });
        })
    ),
    attributes: new fields.SchemaField({
        controlDC: new fields.SchemaField({}),
        eventDC: new fields.SchemaField({}),
    }),
    build: new fields.SchemaField(KINGDOM_BUILD_SCHEMA),
    resources: new fields.SchemaField(KINGDOM_RESOURCES_SCHEMA),
};

export { KINGDOM_SCHEMA };
