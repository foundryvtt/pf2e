import { SkillAbbreviation } from "@actor/creature/data";
import { AbilityString } from "@actor/types";
import { ABCSystemData, ABCSystemSource } from "@item/abc/data";
import { BaseItemSourcePF2e, ItemTraits } from "@item/data/base";

type BackgroundSource = BaseItemSourcePF2e<"background", BackgroundSystemSource>;

interface BackgroundSystemSource extends ABCSystemSource {
    traits: ItemTraits;
    boosts: Record<number, { value: AbilityString[]; selected: AbilityString | null }>;
    trainedLore: string;
    trainedSkills: {
        value: SkillAbbreviation[];
    };
    level?: never;
}

interface BackgroundSystemData extends Omit<BackgroundSystemSource, "items">, Omit<ABCSystemData, "level" | "traits"> {}

export { BackgroundSource, BackgroundSystemData };
