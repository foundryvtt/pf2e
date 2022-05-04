import { SkillAbbreviation } from "@actor/creature/data";
import { AbilityString } from "@actor/data/base";
import { ABCSystemData } from "@item/abc/data";
import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemTraits } from "@item/data/base";
import { BackgroundPF2e } from ".";

type BackgroundSource = BaseItemSourcePF2e<"background", BackgroundSystemSource>;

type BackgroundData = Omit<BackgroundSource, "effects" | "flags"> &
    BaseItemDataPF2e<BackgroundPF2e, "background", BackgroundSystemData, BackgroundSource>;

interface BackgroundSystemSource extends ABCSystemData {
    traits: ItemTraits;
    boosts: { [key: string]: { value: AbilityString[] } };
    trainedLore: string;
    trainedSkills: {
        value: SkillAbbreviation[];
    };
}

type BackgroundSystemData = BackgroundSystemSource;

export { BackgroundData, BackgroundSource };
