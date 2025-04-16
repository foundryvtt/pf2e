import { BaseActorSourcePF2e, FlankingData } from "@actor/data/base.ts";
import { ActorSystemModel, ActorSystemSchema } from "@actor/data/model.ts";
import type { ModelPropFromDataField, ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.d.mts";
import type { LootPF2e } from "./document.ts";
import fields = foundry.data.fields;

/** The stored source data of a loot actor */
type LootSource = BaseActorSourcePF2e<"loot", LootSystemSource>;

class LootSystemData extends ActorSystemModel<LootPF2e, LootSystemSchema> {
    static override defineSchema(): LootSystemSchema {
        return {
            ...super.defineSchema(),
            details: new fields.SchemaField({
                description: new fields.HTMLField({ required: true, nullable: false, blank: true, initial: "" }),
                level: new fields.SchemaField({
                    value: new fields.NumberField({
                        required: true,
                        nullable: false,
                        min: 0,
                        integer: true,
                        initial: 0,
                    }),
                }),
            }),
            lootSheetType: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["Loot", "Merchant"],
                initial: "Loot",
            }),
            hiddenWhenEmpty: new fields.BooleanField(),
        };
    }
}

interface LootSystemData extends ActorSystemModel<LootPF2e, LootSystemSchema>, ModelPropsFromSchema<LootSystemSchema> {
    details: LootDetails;
    traits?: never;
    attributes: LootAttributes;
}

type LootSystemSchema = ActorSystemSchema & {
    details: fields.SchemaField<{
        description: fields.HTMLField<string, string, true, false, true>;
        level: fields.SchemaField<{
            value: fields.NumberField<number, number, true, false, true>;
        }>;
    }>;
    lootSheetType: fields.StringField<"Merchant" | "Loot", "Merchant" | "Loot", true, false, true>;
    hiddenWhenEmpty: fields.BooleanField;
};

/** The system-level data of loot actors. */
interface LootSystemSource extends SourceFromSchema<LootSystemSchema> {
    attributes?: never;
    traits?: never;
    schema?: never;
}

interface LootDetails extends ModelPropFromDataField<LootSystemSchema["details"]> {
    alliance: null;
}

interface LootAttributes {
    immunities: never[];
    weaknesses: never[];
    resistances: never[];
    flanking: FlankingData;
}

export { LootSystemData };
export type { LootSource, LootSystemSource };
