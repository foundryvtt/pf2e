import {
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import { OneToFour, ZeroToThree } from "@module/data.ts";
import { ArmorCategory, ArmorGroup, ArmorTrait, BaseArmorType, OtherArmorTag, ResilientRuneType } from "./index.ts";

type ArmorSource = BasePhysicalItemSource<"armor", ArmorSystemSource>;

interface ArmorSystemSource extends Investable<PhysicalSystemSource> {
    traits: ArmorTraits;
    category: ArmorCategory;
    group: ArmorGroup | null;
    baseItem: BaseArmorType | null;
    acBonus: number;
    strength: number | null;
    dexCap: number;
    checkPenalty: number | null;
    speedPenalty: number | null;
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
}

interface ArmorSystemData
    extends Omit<ArmorSystemSource, "identification" | "price" | "temporary" | "usage">,
        Omit<Investable<PhysicalSystemData>, "traits"> {
    baseItem: BaseArmorType;
    runes: {
        potency: number;
        resilient: ZeroToThree;
        property: string[];
    };
}

interface ArmorTraits extends PhysicalItemTraits<ArmorTrait> {
    otherTags: OtherArmorTag[];
}

export { ArmorSource, ArmorSystemData, ArmorSystemSource };
