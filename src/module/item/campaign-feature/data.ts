import { FrequencyField } from "@item/ability/data.ts";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import { ActionType, BaseItemSourcePF2e, ItemSystemSource } from "@item/base/data/system.ts";
import { OneToThree } from "@module/data.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import { CampaignFeaturePF2e } from "./document.ts";
import { KingmakerCategory, KingmakerTrait } from "./types.ts";
import { KINGMAKER_CATEGORY_TYPES } from "./values.ts";
import fields = foundry.data.fields;

type CampaignFeatureSource = BaseItemSourcePF2e<"campaignFeature", CampaignFeatureSystemSource>;

interface PrerequisiteTagData {
    value: string;
}

class CampaignFeatureSystemData extends ItemSystemModel<CampaignFeaturePF2e, CampaignFeatureSystemSchema> {
    static override defineSchema(): CampaignFeatureSystemSchema {
        const actionTypes: Record<ActionType, string> = CONFIG.PF2E.actionTypes;
        const kingmakerTraits: Record<KingmakerTrait, string> = CONFIG.PF2E.kingmakerTraits;

        return {
            ...super.defineSchema(),
            campaign: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["kingmaker"],
                initial: "kingmaker",
            }),
            category: new fields.StringField({
                required: true,
                nullable: false,
                choices: KINGMAKER_CATEGORY_TYPES,
                initial: "kingdom-activity",
            }),
            level: new fields.SchemaField({
                value: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    min: 1,
                    max: 30,
                    initial: 1,
                }),
            }),
            traits: new fields.SchemaField({
                value: new LaxArrayField(
                    new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: kingmakerTraits,
                        initial: undefined,
                    }),
                ),
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
            }),
            actionType: new fields.SchemaField({
                value: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: actionTypes,
                    initial: "passive",
                }),
            }),
            actions: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: true, choices: [1, 2, 3] as const }),
            }),
            prerequisites: new fields.SchemaField({
                value: new fields.ArrayField(
                    new fields.SchemaField({
                        value: new fields.StringField({ required: true, nullable: false, initial: undefined }),
                    }),
                ),
            }),
            location: new fields.StringField({ required: true, nullable: true, blank: false, initial: null }),
            frequency: new FrequencyField(),
        };
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.frequency ??= null;
        if (this.actor && this.frequency) this.frequency.value ??= this.frequency.max;
    }
}

interface CampaignFeatureSystemData
    extends ItemSystemModel<CampaignFeaturePF2e, CampaignFeatureSystemSchema>,
        Omit<fields.ModelPropsFromSchema<CampaignFeatureSystemSchema>, "description"> {}

type CampaignFeatureSystemSchema = Omit<ItemSystemSchema, "traits"> & {
    level: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    traits: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<KingmakerTrait, KingmakerTrait, true, false, false>>;
        otherTags: fields.ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
    }>;
    campaign: fields.StringField<"kingmaker", "kingmaker", true, false, true>;
    category: fields.StringField<KingmakerCategory, KingmakerCategory, true, false>;
    actionType: fields.SchemaField<{
        value: fields.StringField<ActionType, ActionType, true, false, true>;
    }>;
    actions: fields.SchemaField<{
        value: fields.NumberField<OneToThree, OneToThree, true, true, true>;
    }>;
    prerequisites: fields.SchemaField<{
        value: fields.ArrayField<
            fields.SchemaField<{
                value: fields.StringField<string, string, true, false, false>;
            }>
        >;
    }>;
    location: fields.StringField<string, string, true, true, true>;
    frequency: FrequencyField;
};

type CampaignFeatureSystemSource = fields.SourceFromSchema<CampaignFeatureSystemSchema> & {
    schema?: ItemSystemSource["schema"];
};

export { CampaignFeatureSystemData };
export type { CampaignFeatureSource, CampaignFeatureSystemSource, PrerequisiteTagData };
