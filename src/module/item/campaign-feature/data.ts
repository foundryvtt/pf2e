import { ActionType, BaseItemSourcePF2e, Frequency, FrequencySource, ItemSystemSource } from "@item/data/base.ts";
import { OneToThree, TraitsWithRarity } from "@module/data.ts";
import { KingmakerCategory, KingmakerTrait } from "./types.ts";

type CampaignFeatureSource = BaseItemSourcePF2e<"campaignFeature", CampaignFeatureSystemSource>;

interface PrerequisiteTagData {
    value: string;
}

interface CampaignFeatureSystemSource extends ItemSystemSource {
    campaign: "kingmaker";
    /** The category of feat or feature of this item */
    category: KingmakerCategory;
    /** Level only exists for feat and feature types */
    level?: { value: number };
    traits: KingmakerTraits;
    actionType: {
        value: ActionType;
    };
    actions: {
        value: OneToThree | null;
    };
    prerequisites: {
        value: PrerequisiteTagData[];
    };
    location: string | null;
    frequency?: FrequencySource;
}

interface CampaignFeatureSystemData extends CampaignFeatureSystemSource {
    frequency?: Frequency;
}

type KingmakerTraits = TraitsWithRarity<KingmakerTrait>;

export {
    CampaignFeatureSource,
    CampaignFeatureSystemData,
    CampaignFeatureSystemSource,
    KingmakerTraits,
    PrerequisiteTagData,
};
