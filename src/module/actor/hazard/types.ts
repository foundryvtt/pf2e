import type { ActorPF2e, HazardPF2e } from "@actor";
import type { TraitViewData } from "@actor/data/base.ts";
import type { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import type { SaveType } from "@actor/types.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { AbilityItemPF2e, MeleePF2e } from "@item";
import { NPCAttackTraitOrTag } from "@module/sheet/helpers.ts";

interface HazardSheetData extends ActorSheetDataPF2e<HazardPF2e> {
    attacks: HazardAttackSheedData[];
    actions: HazardActionSheetData;
    complexityOptions: FormSelectOption[];
    emitsSoundOptions: FormSelectOption[];
    editing: boolean;
    actorTraits: TraitViewData[];
    rarity: Record<string, string>;
    rarityLabel: string;
    brokenThreshold: number;
    saves: HazardSaveSheetData[];
    hasDefenses: boolean;
    hasHPDetails: boolean;
    hasSaves: boolean;
    hasIWR: boolean;
    hasStealth: boolean;
    hasDescription: boolean;
    hasDisable: boolean;
    hasRoutineDetails: boolean;
    hasResetDetails: boolean;
}

interface HazardAttackSheedData {
    description: string | null;
    damageFormula: string;
    breakdown: string;
    additionalEffects: { tag?: string; label?: string }[];
    attackRollType: string;
    glyph: string;
    variants: { label: string }[];
    item: MeleePF2e<ActorPF2e>;
    /** A list of traits or tags to show next to the strike. */
    traitsAndTags: NPCAttackTraitOrTag[];
}

interface HazardActionSheetData {
    reaction: AbilityItemPF2e[];
    action: AbilityItemPF2e[];
}

interface HazardSaveSheetData {
    label: string;
    type: SaveType;
    mod?: number;
}

type HazardTrait = keyof ConfigPF2e["PF2E"]["hazardTraits"];

export type { HazardActionSheetData, HazardAttackSheedData, HazardSaveSheetData, HazardSheetData, HazardTrait };
