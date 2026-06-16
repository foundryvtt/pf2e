import type { ModelPropsFromSchema } from "@common/data/fields.d.mts";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import type { BasePhysicalItemSource, PhysicalItemTraits } from "@item/physical/data.ts";
import {
    ApexField,
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
            apex: new ApexField(),
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
            subitems: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
        };
    }

    override prepareBaseData(): void {
        this.subitems ??= [];
    }

    protected override async _preUpdate(
        changes: DeepPartial<EquipmentSystemSource>,
        options: object,
        user: User,
    ): Promise<boolean | void> {
        if ((await super._preUpdate(changes, options, user)) === false) return;
        const isApex = (changes.traits?.value ?? this.traits.value).includes("apex");
        if (!isApex) this.apex = null;
    }
}
interface EquipmentSystemData
    extends
        PhysicalItemSystemModel<EquipmentPF2e, EquipmentSystemSchema>,
        Omit<ModelPropsFromSchema<EquipmentSystemSchema>, PhysicalItemModelOmission> {}

type EquipmentSystemSchema = Omit<PhysicalItemSystemSchema, "traits"> & {
    apex: ApexField;
    traits: fields.SchemaField<PhysicalItemTraitsSchema<EquipmentTrait>>;
    usage: fields.SchemaField<{
        value: fields.StringField<string, string, true, false>;
    }>;
    subitems: fields.ArrayField<fields.ObjectField<PhysicalItemSource, PhysicalItemSource, true, false>>;
};

type EquipmentSystemSource = PhysicalItemSystemSource<EquipmentSystemSchema>;

export { EquipmentSystemData };
export type { EquipmentSource, EquipmentSystemSource, EquipmentTrait };
