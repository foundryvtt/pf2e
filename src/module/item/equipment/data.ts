import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import type { BasePhysicalItemSource, PhysicalItemTraits } from "@item/physical/data.ts";
import {
    type PhysicalItemModelOmission,
    PhysicalItemSystemModel,
    PhysicalItemSystemSchema,
    PhysicalItemSystemSource,
    PhysicalItemTraitsSchema,
} from "@item/physical/schema.ts";
import { RarityField } from "@module/model.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { EquipmentPF2e } from "./document.ts";
import type { EquipmentTrait } from "./types.ts";
import fields = foundry.data.fields;

type EquipmentSource = BasePhysicalItemSource<"equipment", EquipmentSystemSource>;

class EquipmentSystemData extends PhysicalItemSystemModel<EquipmentPF2e, EquipmentSystemSchema> {
    declare traits: PhysicalItemTraits<EquipmentTrait>;

    static override defineSchema(): EquipmentSystemSchema {
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
            usage: new fields.SchemaField({
                value: new fields.StringField({ required: true, nullable: false, initial: "held-in-one-hand" }),
            }),
            temporary: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            subitems: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
        };
    }
}
interface EquipmentSystemData
    extends PhysicalItemSystemModel<EquipmentPF2e, EquipmentSystemSchema>,
        Omit<ModelPropsFromSchema<EquipmentSystemSchema>, PhysicalItemModelOmission> {}

type EquipmentSystemSchema = Omit<PhysicalItemSystemSchema, "traits"> & {
    traits: fields.SchemaField<PhysicalItemTraitsSchema<EquipmentTrait>>;
    usage: fields.SchemaField<{
        value: fields.StringField<string, string, true, false>;
    }>;
    temporary: fields.BooleanField<boolean, boolean, true, false, true>;
    subitems: fields.ArrayField<fields.ObjectField<PhysicalItemSource, PhysicalItemSource, true, false>>;
};

type EquipmentSystemSource = PhysicalItemSystemSource<EquipmentSystemSchema>;

export { EquipmentSystemData };
export type { EquipmentSource, EquipmentSystemSource, EquipmentTrait };
