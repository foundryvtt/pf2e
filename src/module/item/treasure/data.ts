import type { BasePhysicalItemSource, EquippedData } from "@item/physical/data.ts";
import { PhysicalItemModelOmission, PhysicalItemSystemModel, PhysicalItemSystemSchema } from "@item/physical/schema.ts";
import type { CarriedUsage } from "@item/physical/usage.ts";
import { RarityField } from "@module/model.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { TreasurePF2e } from "./document.ts";
import { TreasureCategory } from "./types.ts";
import { TREASURE_CATEGORIES } from "./values.ts";
import fields = foundry.data.fields;

class TreasureSystemData extends PhysicalItemSystemModel<TreasurePF2e, TreasureSystemSchema> {
    static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "PF2E.Item.Treasure"];

    static override defineSchema(): TreasureSystemSchema {
        return {
            ...super.defineSchema(),
            category: new fields.StringField({ required: true, nullable: true, choices: TREASURE_CATEGORIES }),
            traits: new fields.SchemaField({
                value: new LaxArrayField(new fields.StringField({ required: true, choices: ["precious"] } as const)),
                rarity: new RarityField(),
                otherTags: new fields.ArrayField(new SlugField({ required: true, initial: undefined })),
            }),
        };
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        const migrated = super.migrateData(source);
        if (migrated.size === "sm") migrated.size = "med";
        if (migrated.stackGroup === "coins") migrated.category = "coin";
        else if (migrated.stackGroup === "gems") migrated.category = "gem";
        return migrated;
    }

    get stackGroup(): "coins" | "gems" | "upb" | null {
        if (this.slug === "upb") return "upb";

        switch (this.category) {
            case "coin":
                return "coins";
            case "gem":
                return "gems";
            default:
                return null;
        }
    }

    /** Treasure need only be on one's person. */
    declare usage: CarriedUsage;

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.price.sizeSensitive = false;
        if (this.category === "coin") this.size = "med";
    }
}

interface TreasureSystemData
    extends
        PhysicalItemSystemModel<TreasurePF2e, TreasureSystemSchema>,
        Omit<fields.ModelPropsFromSchema<TreasureSystemSchema>, PhysicalItemModelOmission> {
    apex?: never;
    equipped: TreasureEquippedData;
    subitems?: never;
}

interface TreasureSystemSource extends fields.SourceFromSchema<TreasureSystemSchema> {
    apex?: never;
    schema?: never;
    subitems?: never;
    usage?: never;
}

type TreasureSystemSchema = Omit<PhysicalItemSystemSchema, "traits"> & {
    category: fields.StringField<TreasureCategory, TreasureCategory, true, true, true>;
    traits: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<"precious", "precious", true, false, false>>;
        rarity: RarityField;
        otherTags: fields.ArrayField<SlugField<true, false, false>>;
    }>;
};

interface TreasureSource extends BasePhysicalItemSource<"treasure", TreasureSystemSource> {}

interface TreasureEquippedData extends EquippedData {
    invested?: never;
}

export { TreasureSystemData };
export type { TreasureSource, TreasureSystemSchema, TreasureSystemSource };
