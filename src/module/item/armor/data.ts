import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { OneToFour, ZeroToThree } from "@module/data";
import type { ArmorPF2e } from ".";
import { ArmorCategory, ArmorGroup, ArmorTrait, BaseArmorType, OtherArmorTag, ResilientRuneType } from "./types";

type ArmorSource = BasePhysicalItemSource<"armor", ArmorSystemSource>;

type ArmorData = Omit<ArmorSource, "system" | "effects" | "flags"> &
    BasePhysicalItemData<ArmorPF2e, "armor", ArmorSystemData, ArmorSource>;

interface ArmorSystemSource extends Investable<PhysicalSystemSource> {
    traits: ArmorTraits;
    armor: {
        value: number;
    };
    category: ArmorCategory;
    group: ArmorGroup | null;
    baseItem: BaseArmorType | null;

    strength: {
        value: number;
    };
    dex: {
        value: number;
    };
    check: {
        value: number;
    };
    speed: {
        value: number;
    };
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

interface ArmorTraitsSource extends PhysicalItemTraits<ArmorTrait> {
    otherTags?: OtherArmorTag[];
}

type ArmorTraits = Required<ArmorTraitsSource>;

export { ArmorData, ArmorSource, ArmorSystemData, ArmorSystemSource };
