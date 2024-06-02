import { AttributeString, SkillSlug } from "@actor/types.ts";
import { ABCSystemData, ABCSystemSource } from "@item/abc/data.ts";
import { BaseItemSourcePF2e, ItemTraits } from "@item/base/data/system.ts";
import { BackgroundTrait } from "./types.ts";

type BackgroundSource = BaseItemSourcePF2e<"background", BackgroundSystemSource>;

interface BackgroundSystemSource extends ABCSystemSource {
    traits: BackgroundTraits;
    boosts: Record<number, { value: AttributeString[]; selected: AttributeString | null }>;
    trainedSkills: {
        value: SkillSlug[];
        lore: string[];
    };
    level?: never;
}

type BackgroundTraits = ItemTraits<BackgroundTrait>;

interface BackgroundSystemData
    extends Omit<BackgroundSystemSource, "description" | "items">,
        Omit<ABCSystemData, "level" | "traits"> {}

export type { BackgroundSource, BackgroundSystemData, BackgroundSystemSource };
