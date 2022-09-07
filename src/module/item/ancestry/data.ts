import { CreatureTrait, Language } from "@actor/creature/data";
import { AbilityString } from "@actor/types";
import { ABCSystemData } from "@item/abc/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e } from "@item/data/base";
import { Size, TraitsWithRarity, ValuesList } from "@module/data";
import type { AncestryPF2e } from ".";

type AncestrySource = BaseItemSourcePF2e<"ancestry", AncestrySystemSource>;

type AncestryData = Omit<AncestrySource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<AncestryPF2e, "ancestry", AncestrySystemData, AncestrySource>;

export type CreatureTraits = TraitsWithRarity<CreatureTrait>;

interface AncestrySystemSource extends ABCSystemData {
    traits: CreatureTraits;
    additionalLanguages: {
        count: number; // plus int
        value: string[];
        custom: string;
    };
    boosts: Record<string, { value: AbilityString[]; selected: AbilityString | null }>;
    flaws: Record<string, { value: AbilityString[]; selected: AbilityString | null }>;
    voluntary?: {
        boost: AbilityString | null;
        flaws: AbilityString[];
    };
    hp: number;
    languages: ValuesList<Language>;
    speed: number;
    size: Size;
    reach: number;
    vision: "normal" | "darkvision" | "lowLightVision";
}

type AncestrySystemData = AncestrySystemSource;

export { AncestrySource, AncestryData, AncestrySystemData };
