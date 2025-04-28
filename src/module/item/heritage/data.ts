import type { CreatureTrait } from "@actor/creature/index.ts";
import type { ItemUUID } from "@client/documents/_module.d.mts";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import type { BaseItemSourcePF2e, ItemSystemSource } from "@item/base/data/system.ts";
import { RarityField } from "@module/model.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { HeritagePF2e } from "./document.ts";
import fields = foundry.data.fields;

type HeritageSource = BaseItemSourcePF2e<"heritage", HeritageSystemSource>;

class HeritageSystemData extends ItemSystemModel<HeritagePF2e, HeritageSystemSchema> {
    static override defineSchema(): HeritageSystemSchema {
        const creatureTraits: Record<CreatureTrait, string> = CONFIG.PF2E.creatureTraits;

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
                        choices: creatureTraits,
                        initial: undefined,
                    }),
                ),
                rarity: new RarityField(),
            }),
            ancestry: new fields.SchemaField(
                {
                    name: new fields.StringField({ required: true, nullable: false, blank: true }),
                    slug: new SlugField({ required: true, nullable: false }),
                    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
                },
                { required: true, nullable: true, initial: null },
            ),
        };
    }
}

interface HeritageSystemData
    extends ItemSystemModel<HeritagePF2e, HeritageSystemSchema>,
        Omit<fields.ModelPropsFromSchema<HeritageSystemSchema>, "description"> {
    level?: never;
}

type HeritageSystemSchema = Omit<ItemSystemSchema, "traits"> & {
    traits: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<CreatureTrait, CreatureTrait, true, false, false>>;
        otherTags: fields.ArrayField<SlugField<true, false, false>>;
        rarity: RarityField;
    }>;
    ancestry: fields.SchemaField<
        HeritageAncestrySchema,
        fields.SourceFromSchema<HeritageAncestrySchema>,
        fields.ModelPropsFromSchema<HeritageAncestrySchema>,
        true,
        true
    >;
};

type HeritageAncestrySchema = {
    name: fields.StringField<string, string, true, false>;
    slug: SlugField<true, false, false>;
    uuid: fields.DocumentUUIDField<ItemUUID, true, false>;
};

type HeritageSystemSource = fields.SourceFromSchema<HeritageSystemSchema> & {
    level?: never;
    schema?: ItemSystemSource["schema"];
};

export { HeritageSystemData };
export type { HeritageSource, HeritageSystemSource };
