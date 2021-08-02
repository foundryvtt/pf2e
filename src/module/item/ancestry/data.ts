import { CreatureTrait } from "@actor/creature/data";
import { AbilityString } from "@actor/data/base";
import { ABCSystemData } from "@item/abc/data";
import { ItemTraits } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { Size } from "@module/data";
import type { AncestryPF2e } from ".";

export type AncestrySource = BaseNonPhysicalItemSource<"ancestry", AncestrySystemData>;

export class AncestryData extends BaseNonPhysicalItemData<AncestryPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/ancestry.svg";
}

export interface AncestryData extends Omit<AncestrySource, "_id" | "effects"> {
    type: AncestrySource["type"];
    data: AncestrySource["data"];
    readonly _source: AncestrySource;
}

export type CreatureTraits = ItemTraits<CreatureTrait>;

export interface AncestrySystemData extends ABCSystemData {
    traits: CreatureTraits;
    additionalLanguages: {
        count: number; // plus int
        value: string[];
        custom: string;
    };
    boosts: { [key: string]: { value: AbilityString[] } };
    flaws: { [key: string]: { value: AbilityString[] } };
    hp: number;
    languages: {
        value: string[];
        custom: string;
    };
    speed: number;
    size: Size;
    reach: number;
}
