import { CreatureTrait, Language } from "@actor/creature/index.ts";
import { AttributeString } from "@actor/types.ts";
import { ABCSystemData, ABCSystemSource } from "@item/abc/index.ts";
import { BaseItemSourcePF2e, ItemTraits } from "@item/base/data/system.ts";
import { Size, TraitsWithRarity, ValuesList } from "@module/data.ts";

type AncestrySource = BaseItemSourcePF2e<"ancestry", AncestrySystemSource>;

type CreatureTraits = TraitsWithRarity<CreatureTrait>;
type AncestryTraits = ItemTraits<CreatureTrait>;

interface AncestrySystemSource extends ABCSystemSource {
    traits: AncestryTraits;
    additionalLanguages: {
        count: number; // plus int
        value: string[];
        custom: string;
    };
    /** If present, use the alternate ancestry boosts, which are two free */
    alternateAncestryBoosts?: AttributeString[];
    boosts: Record<string, { value: AttributeString[]; selected: AttributeString | null }>;
    flaws: Record<string, { value: AttributeString[]; selected: AttributeString | null }>;
    voluntary?: {
        boost?: AttributeString | null;
        flaws: AttributeString[];
    };
    hp: number;
    languages: ValuesList<Language>;
    /** This ancestry's base land speed */
    speed: number;
    /** This ancestry's default size category */
    size: Size;
    /** The number of hands this ancestry provides */
    hands: number;
    /** The reach using this ancestry's hands */
    reach: number;
    /** This ancestry's default vision level */
    vision: "normal" | "darkvision" | "low-light-vision";

    level?: never;
}

interface AncestrySystemData
    extends Omit<AncestrySystemSource, "description" | "items">,
        Omit<ABCSystemData, "level" | "traits"> {}

export type { AncestrySource, AncestrySystemData, AncestrySystemSource, AncestryTraits, CreatureTraits };
