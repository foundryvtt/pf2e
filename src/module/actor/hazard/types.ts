import { HazardPF2e } from "@actor";
import { TraitViewData } from "@actor/data/base.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { SaveType } from "@actor/types.ts";
import { ActionItemPF2e } from "@item";

interface HazardSheetData extends ActorSheetDataPF2e<HazardPF2e> {
    actions: HazardActionSheetData;
    editing: boolean;
    actorTraits: TraitViewData[];
    rarity: Record<string, string>;
    rarityLabel: string;
    brokenThreshold: number;
    saves: HazardSaveSheetData[];
    stealthDC: number | null;

    hasDefenses: boolean;
    hasHPDetails: boolean;
    hasSaves: boolean;
    hasIWR: boolean;
    hasStealth: boolean;
    hasStealthDescription: boolean;
    hasDescription: boolean;
    hasDisable: boolean;
    hasRoutineDetails: boolean;
    hasResetDetails: boolean;
}

interface HazardActionSheetData {
    reaction: ActionItemPF2e[];
    action: ActionItemPF2e[];
}

interface HazardSaveSheetData {
    label: string;
    type: SaveType;
    mod?: number;
}

type HazardTrait = keyof ConfigPF2e["PF2E"]["hazardTraits"];

export { HazardActionSheetData, HazardSaveSheetData, HazardSheetData, HazardTrait };
