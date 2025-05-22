import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { EquipmentTrait } from "@item/equipment/data.ts";
import type { BasePhysicalItemSource, BulkData, PhysicalItemTraits } from "@item/physical/data.ts";
import {
    PhysicalItemModelOmission,
    PhysicalItemSystemModel,
    PhysicalItemSystemSchema,
    PhysicalItemSystemSource,
    PhysicalItemTraitsSchema,
} from "@item/physical/schema.ts";
import { RarityField } from "@module/model.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { ContainerPF2e } from "./document.ts";
import fields = foundry.data.fields;

type ContainerSource = BasePhysicalItemSource<"backpack", ContainerSystemSource>;

class ContainerSystemData extends PhysicalItemSystemModel<ContainerPF2e, ContainerSystemSchema> {
    declare traits: PhysicalItemTraits<EquipmentTrait>;

    declare temporary: boolean;

    declare bulk: ContainerBulkData;

    static override defineSchema(): ContainerSystemSchema {
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
            bulk: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
                heldOrStowed: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0.1 }),
                capacity: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 10 }),
                ignored: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
            }),
            usage: new fields.SchemaField({
                value: new fields.StringField({ required: true, nullable: false, initial: "worn" }),
            }),
            collapsed: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            stowing: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        };
    }

    override prepareBaseData(): void {
        this.temporary = false;

        // Simple measure to avoid self-recursive containers
        if (this.containerId === this.parent.id) {
            this.containerId = null;
        }
    }
}

interface ContainerSystemData
    extends PhysicalItemSystemModel<ContainerPF2e, ContainerSystemSchema>,
        Omit<ModelPropsFromSchema<ContainerSystemSchema>, PhysicalItemModelOmission> {}

type ContainerSystemSchema = Omit<PhysicalItemSystemSchema, "traits" | "bulk"> & {
    traits: fields.SchemaField<PhysicalItemTraitsSchema<EquipmentTrait>>;
    bulk: fields.SchemaField<ContainerBulkSchema>;
    usage: fields.SchemaField<{
        value: fields.StringField<string, string, true, false>;
    }>;
    collapsed: fields.BooleanField<boolean, boolean, true, false, true>;
    stowing: fields.BooleanField<boolean, boolean, true, false, true>;
};

type ContainerBulkSchema = {
    value: fields.NumberField<number, number, true, false, true>;
    heldOrStowed: fields.NumberField<number, number, true, false, true>;
    capacity: fields.NumberField<number, number, true, false, true>;
    ignored: fields.NumberField<number, number, true, false, true>;
};

type ContainerSystemSource = PhysicalItemSystemSource<ContainerSystemSchema> & {
    subitems?: never;
};

interface ContainerBulkData extends ModelPropsFromSchema<ContainerBulkSchema>, BulkData {}

export { ContainerSystemData };
export type { ContainerBulkData, ContainerSource };
