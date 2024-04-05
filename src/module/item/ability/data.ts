import {
    ActionType,
    BaseItemSourcePF2e,
    Frequency,
    FrequencySource,
    ItemSystemData,
    ItemSystemSource,
    ItemTraitsNoRarity,
} from "@item/base/data/system.ts";
import { OneToThree } from "@module/data.ts";
import type { AbilityTraitToggles } from "./trait-toggles.ts";
import { ActionCategory, ActionTrait } from "./types.ts";

type AbilitySource = BaseItemSourcePF2e<"action", AbilitySystemSource>;

interface AbilitySystemSource extends ItemSystemSource {
    traits: AbilityTraitsSource;
    actionType: {
        value: ActionType;
    };
    actions: {
        value: OneToThree | null;
    };
    category: ActionCategory | null;
    deathNote: boolean;
    frequency?: FrequencySource;

    /** A self-applied effect for simple actions */
    selfEffect?: SelfEffectReferenceSource | null;

    level?: never;
}

interface AbilityTraitsSource extends ItemTraitsNoRarity<ActionTrait> {
    toggles?: { mindshift?: { selected?: boolean } | null };
}

interface SelfEffectReferenceSource {
    uuid: ItemUUID;
    name: string;
}

interface AbilitySystemData extends Omit<AbilitySystemSource, "description">, Omit<ItemSystemData, "level"> {
    traits: AbilityTraits;
    frequency?: Frequency;
    /** A self-applied effect for simple actions */
    selfEffect: SelfEffectReference | null;
}

interface AbilityTraits extends AbilityTraitsSource {
    toggles: AbilityTraitToggles;
}

interface SelfEffectReference extends SelfEffectReferenceSource {
    img?: Maybe<ImageFilePath>;
}

export type { AbilitySource, AbilitySystemData, AbilityTraitsSource, SelfEffectReference, SelfEffectReferenceSource };
