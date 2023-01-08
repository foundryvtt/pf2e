import { CreatureTrait, Language } from "@actor/creature/data";
import { AbilityString } from "@actor/types";
import { ABCSystemData, ABCSystemSource } from "@item/abc/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemTraits } from "@item/data/base";
import { Size, ValuesList } from "@module/data";
import type { AncestryPF2e } from ".";

type AncestrySource = BaseItemSourcePF2e<"ancestry", AncestrySystemSource>;

type AncestryData = Omit<AncestrySource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<AncestryPF2e, "ancestry", AncestrySystemData, AncestrySource>;

export type CreatureTraits = ItemTraits<CreatureTrait>;

interface AncestrySystemSource extends ABCSystemSource {
    traits: CreatureTraits;
    additionalLanguages: {
        count: number; // plus int
        value: string[];
        custom: string;
    };
    /** If present, use the alternate ancestry boosts, which are two free */
    alternateAncestryBoosts?: AbilityString[];
    boosts: Record<string, { value: AbilityString[]; selected: AbilityString | null }>;
    flaws: Record<string, { value: AbilityString[]; selected: AbilityString | null }>;
    voluntary?: {
        boost?: AbilityString | null;
        flaws: AbilityString[];
    };
    hp: number;
    languages: ValuesList<Language>;
    speed: number;
    size: Size;
    reach: number;
    vision: "normal" | "darkvision" | "lowLightVision";
}

interface AncestrySystemData extends Omit<AncestrySystemSource, "items">, Omit<ABCSystemData, "traits"> {}

export { AncestrySource, AncestryData, AncestrySystemData };
