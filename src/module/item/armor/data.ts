import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
    PreciousMaterialGrade,
} from "@item/physical";
import { OneToFour, ZeroToFour, ZeroToThree } from "@module/data";
import {
    ArmorCategory,
    ArmorGroup,
    ArmorTrait,
    BaseArmorType,
    OtherArmorTag,
    ResilientRuneType,
    type ArmorPF2e,
    ArmorMaterialType,
    ArmorPropertyRuneType,
} from ".";

type ArmorSource = BasePhysicalItemSource<"armor", ArmorSystemSource>;

type ArmorData = Omit<ArmorSource, "system" | "effects" | "flags"> &
    BasePhysicalItemData<ArmorPF2e, "armor", ArmorSystemData, ArmorSource>;

type SpecificArmorData =
    | {
          value: false;
      }
    | {
          value: true;
          price: string;
          material: {
              precious?: {
                  type: ArmorMaterialType;
                  grade: PreciousMaterialGrade;
              };
          };
          runes: Omit<ArmorRuneData, "property">;
      };

interface ArmorRuneData {
    potency: OneToFour | null;
    resilient: ResilientRuneType | null;
    property: Record<OneToFour, ArmorPropertyRuneType | null>;
}

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

    specific?: SpecificArmorData;
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
    propertyRune1: ArmorPropertyRuneSlot;
    propertyRune2: ArmorPropertyRuneSlot;
    propertyRune3: ArmorPropertyRuneSlot;
    propertyRune4: ArmorPropertyRuneSlot;

    preciousMaterial: {
        value: ArmorMaterialType | null;
    };

    resiliencyRune: {
        value: ResilientRuneType | null;
    };
}

interface ArmorPropertyRuneSlot {
    value: ArmorPropertyRuneType | null;
}

interface ArmorSystemData
    extends Omit<ArmorSystemSource, "identification" | "price" | "temporary" | "usage">,
        Omit<Investable<PhysicalSystemData>, "traits"> {
    baseItem: BaseArmorType;
    runes: {
        potency: ZeroToFour;
        resilient: ZeroToThree;
        property: ArmorPropertyRuneType[];
    };
    material: ArmorMaterialData;
}

interface ArmorTraits extends PhysicalItemTraits<ArmorTrait> {
    otherTags: OtherArmorTag[];
}

interface ArmorMaterialData {
    /** The precious material of which this armor is composed */
    precious: {
        type: ArmorMaterialType;
        grade: PreciousMaterialGrade;
    } | null;
}

export { ArmorData, ArmorMaterialData, ArmorSource, ArmorSystemData, ArmorSystemSource };
