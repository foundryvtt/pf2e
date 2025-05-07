import { PhysicalItemSource } from "@item/base/data/index.ts";
import { ItemSystemModel } from "@item/base/data/model.ts";
import { BaseItemSourcePF2e, ItemSystemSource } from "@item/base/data/system.ts";
import { EquipmentTrait } from "@item/equipment/types.ts";
import { BulkData, IdentificationData, ItemMaterialData, PhysicalItemHitPoints } from "@item/physical/data.ts";
import { PhysicalItemSystemModel, PhysicalItemSystemSchema } from "@item/physical/schema.ts";
import { UsageDetails } from "@item/physical/usage.ts";
import { RarityField } from "@module/model.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { AugmentationPF2e } from "./document.ts";
import fields = foundry.data.fields;

type AugmentationSource = BaseItemSourcePF2e<"augmentation", AugmentationSystemSource>;

class AugmentationSystemData extends PhysicalItemSystemModel<AugmentationPF2e, AugmentationSystemSchema> {
    static override LOCALIZATION_PREFIXES = ["PF2E.Item.Augmentation"];

    declare bulk: BulkData;

    declare material: ItemMaterialData;

    declare usage: UsageDetails;

    declare temporary: false;

    declare identification: IdentificationData;

    declare stackGroup: null;

    declare subitems: PhysicalItemSource[];

    declare hp: PhysicalItemHitPoints;

    static override defineSchema(): AugmentationSystemSchema {
        const traits: Record<EquipmentTrait, string> = CONFIG.PF2E.equipmentTraits;

        return {
            ...super.defineSchema(),
            traits: new fields.SchemaField({
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
                value: new LaxArrayField(
                    new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: traits,
                        initial: undefined,
                    }),
                ),
                rarity: new RarityField(),
            }),
            // overriden to only allow 0 bulk
            bulk: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, min: 0, max: 0, initial: 0 }),
            }),
            countsTowardsLimit: new fields.BooleanField({
                required: true,
                nullable: false,
                initial: true,
            }),
        };
    }

    override prepareBaseData(): void {
        this.bulk = { value: 0, per: 1, heldOrStowed: 0 };
        this.material = { ...this.material, effects: [] };
        this.temporary = false;
        this.stackGroup = null;
        this.subitems = [];

        // Set usage to a specific value. Physical item's prepareBaseData overrides whatever we do */
        this.usage = { value: "implanted", type: "implanted" };
    }
}

interface AugmentationSystemData
    extends ItemSystemModel<AugmentationPF2e, AugmentationSystemSchema>,
        Omit<fields.ModelPropsFromSchema<AugmentationSystemSchema>, "description"> {}

type AugmentationSystemSchema = Omit<PhysicalItemSystemSchema, "traits"> & {
    traits: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<EquipmentTrait, EquipmentTrait, true, false, false>>;
        rarity: RarityField;
        otherTags: fields.ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
    }>;
    /** If false, this augmentation doesn't count against the limit */
    countsTowardsLimit: fields.BooleanField<boolean, boolean, true, false, true>;
};

type AugmentationSystemSource = fields.SourceFromSchema<AugmentationSystemSchema> & {
    schema?: ItemSystemSource["schema"];
    material?: never;
    usage?: never;
    subitems?: never;
};

export { AugmentationSystemData };
export type { AugmentationSource, AugmentationSystemSource };
