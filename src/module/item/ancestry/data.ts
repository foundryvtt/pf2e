import { CreatureTrait, Language } from "@actor/creature/index.ts";
import { AbilityString } from "@actor/types.ts";
import { ABCSystemData, ABCSystemSource } from "@item/abc/index.ts";
import { BaseItemSourcePF2e } from "@item/data/base.ts";
import { Size, TraitsWithRarity, ValuesList } from "@module/data.ts";

type AncestrySource = BaseItemSourcePF2e<"ancestry", AncestrySystemSource>;

export type CreatureTraits = TraitsWithRarity<CreatureTrait>;

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
    level?: never;
}

interface AncestrySystemData extends Omit<AncestrySystemSource, "items">, Omit<ABCSystemData, "level" | "traits"> {}

export { AncestrySource, AncestrySystemData };
