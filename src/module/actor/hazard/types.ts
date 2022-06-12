import { HazardPF2e } from "@actor";
import { SaveType } from "@actor/data";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { ActionItemPF2e } from "@item";

interface HazardSheetData extends ActorSheetDataPF2e<HazardPF2e> {
    actions: HazardActionSheetData;
    editing: boolean;
    actorTraits: string[];
    rarity: Record<string, string>;
    rarityLabel: string;
    brokenThreshold: number;
    saves: HazardSaveSheetData[];
    stealthDC: number | null;

    hasHealth: boolean;
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

interface HazardSaveSheetData {
    label: string;
    type: SaveType;
    mod?: number;
}

interface HazardActionSheetData {
    passive: ActionsDetails;
    free: ActionsDetails;
    reaction: ActionsDetails;
    action: ActionsDetails;
}

interface ActionsDetails {
    label: string;
    actions: ActionItemPF2e[];
}

export { HazardActionSheetData, HazardSaveSheetData, HazardSheetData };
