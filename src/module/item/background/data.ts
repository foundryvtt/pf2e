import { SkillAbbreviation } from "@actor/creature/data";
import { AbilityString } from "@actor/types";
import { ABCSystemData, ABCSystemSource } from "@item/abc/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemTraits } from "@item/data/base";
import { BackgroundPF2e } from ".";

type BackgroundSource = BaseItemSourcePF2e<"background", BackgroundSystemSource>;

type BackgroundData = Omit<BackgroundSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<BackgroundPF2e, "background", BackgroundSystemData, BackgroundSource>;

interface BackgroundSystemSource extends ABCSystemSource {
    traits: ItemTraits;
    boosts: Record<number, { value: AbilityString[]; selected: AbilityString | null }>;
    trainedLore: string;
    trainedSkills: {
        value: SkillAbbreviation[];
    };
}

interface BackgroundSystemData extends Omit<BackgroundSystemSource, "items">, Omit<ABCSystemData, "traits"> {}

export { BackgroundData, BackgroundSource };
