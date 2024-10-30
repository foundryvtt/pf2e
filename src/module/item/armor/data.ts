import { PhysicalItemSource } from "@item/base/data/index.ts";
import {
    BasePhysicalItemSource,
    Investable,
    ItemMaterialSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import { WornUsage } from "@item/physical/usage.ts";
import { ZeroToFour } from "@module/data.ts";
import { ArmorCategory, ArmorGroup, ArmorPropertyRuneType, ArmorTrait, BaseArmorType, OtherArmorTag } from "./index.ts";

type ArmorSource = BasePhysicalItemSource<"armor", ArmorSystemSource>;

interface ArmorSystemSource extends Investable<PhysicalSystemSource> {
    traits: ArmorTraits;
    category: ArmorCategory;
    group: ArmorGroup | null;
    baseItem: BaseArmorType | null;
    acBonus: number;
    strength: number | null;
    dexCap: number;
    checkPenalty: number;
    speedPenalty: number;
    runes: ArmorRuneSource;
    /** Details of specific magic armor, storing the material and rune state when toggled on */
    specific: SpecificArmorData | null;
    /** Doubly-embedded adjustments, attachments, talismans etc. */
    subitems: PhysicalItemSource[];
    /** Usage for armor isn't stored. */
    readonly usage?: never;
}

type ArmorRuneSource = {
    potency: ZeroToFour;
    resilient: ZeroToFour;
    property: ArmorPropertyRuneType[];
};

/** A weapon can either be unspecific or specific along with baseline material and runes */
type SpecificArmorData = {
    material: ItemMaterialSource;
    runes: ArmorRuneSource;
};

interface ArmorSystemData
    extends Omit<ArmorSystemSource, SourceOmission>,
        Omit<Investable<PhysicalSystemData>, "baseItem" | "subitems" | "traits"> {
    runes: ArmorRuneData;
    /** Armor is always worn in the "armor" slot. */
    usage: WornUsage;
    stackGroup: null;
}

type SourceOmission =
    | "apex"
    | "bulk"
    | "description"
    | "hp"
    | "identification"
    | "material"
    | "price"
    | "temporary"
    | "usage";

interface ArmorTraits extends PhysicalItemTraits<ArmorTrait> {
    otherTags: OtherArmorTag[];
}

interface ArmorRuneData extends ArmorRuneSource {
    effects: ArmorPropertyRuneType[];
}

export type { ArmorSource, ArmorSystemData, ArmorSystemSource, SpecificArmorData };
