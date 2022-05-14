import { CreatureTrait, Language } from "@actor/creature/data";
import { AbilityString } from "@actor/data/base";
import { ABCSystemData } from "@item/abc/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemTraits } from "@item/data/base";
import { Size, ValuesList } from "@module/data";
import type { AncestryPF2e } from ".";

type AncestrySource = BaseItemSourcePF2e<"ancestry", AncestrySystemSource>;

type AncestryData = Omit<AncestrySource, "effects" | "flags"> &
    BaseItemDataPF2e<AncestryPF2e, "ancestry", AncestrySystemData, AncestrySource>;

export type CreatureTraits = ItemTraits<CreatureTrait>;

interface AncestrySystemSource extends ABCSystemData {
    traits: CreatureTraits;
    additionalLanguages: {
        count: number; // plus int
        value: string[];
        custom: string;
    };
    boosts: { [key: string]: { value: AbilityString[] } };
    flaws: { [key: string]: { value: AbilityString[] } };
    hp: number;
    languages: ValuesList<Language>;
    speed: number;
    size: Size;
    reach: number;
    vision: "normal" | "darkvision" | "lowLightVision";
}

type AncestrySystemData = AncestrySystemSource;

export { AncestrySource, AncestryData };
