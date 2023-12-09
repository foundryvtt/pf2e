import {
    BasePhysicalItemSource,
    Investable,
    ItemMaterialData,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import { WornUsage } from "@item/physical/usage.ts";
import { OneToFour, ZeroToFour, ZeroToThree } from "@module/data.ts";
import {
    ArmorCategory,
    ArmorGroup,
    ArmorPropertyRuneType,
    ArmorTrait,
    BaseArmorType,
    OtherArmorTag,
    ResilientRuneType,
} from "./index.ts";

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
    /** Whether the armor is "specific magic armor" */
    specific?: SpecificArmorData;

    potencyRune: {
        value: OneToFour | null;
    };
    resiliencyRune: {
        value: ResilientRuneType | null;
    };
    propertyRune1: {
        value: string;
    };
    propertyRune2: {
        value: string;
    };
    propertyRune3: {
        value: string;
    };
    propertyRune4: {
        value: string;
    };
    /** Usage for armor isn't stored. */
    readonly usage?: never;
}

/** A weapon can either be unspecific or specific along with baseline material and runes */
type SpecificArmorData =
    | {
          value: false;
          material?: never;
          runes?: never;
      }
    | {
          value: true;
          material: Omit<ItemMaterialData, "effects">;
          runes: Pick<ArmorRuneData, "potency" | "resilient">;
      };

interface ArmorSystemData
    extends Omit<ArmorSystemSource, "bulk" | "hp" | "identification" | "material" | "price" | "temporary" | "usage">,
        Omit<Investable<PhysicalSystemData>, "baseItem" | "traits"> {
    runes: ArmorRuneData;
    /** Armor is always worn in the "armor" slot. */
    usage: WornUsage;
}

interface ArmorTraits extends PhysicalItemTraits<ArmorTrait> {
    otherTags: OtherArmorTag[];
}

interface ArmorRuneData {
    potency: ZeroToFour;
    resilient: ZeroToThree;
    property: ArmorPropertyRuneType[];
    effects: ArmorPropertyRuneType[];
}

export type { ArmorSource, ArmorSystemData, ArmorSystemSource };
