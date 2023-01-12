import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { MeleePF2e, WeaponPF2e } from "@item";
import { SpellcastingEntryData } from "@item/data";
import { SpellcastingAbilityData } from "@item/spellcasting-entry/data";
import { CreaturePF2e } from ".";
import { SheetOptions } from "@module/sheet/helpers";
import { ALIGNMENTS, ALIGNMENT_TRAITS } from "./values";
import { FlattenedCondition } from "@system/conditions";
import { ActorUpdateContext } from "@actor/base";
import { AbilityData, CreatureSystemData, SaveData, SkillData } from "./data";
import { ZeroToFour } from "@module/data";
import { AbilityString, SaveType } from "@actor/types";

type Alignment = SetElement<typeof ALIGNMENTS>;
type AlignmentTrait = SetElement<typeof ALIGNMENT_TRAITS>;

type ModeOfBeing = "living" | "undead" | "construct" | "object";

interface GetReachParameters {
    action?: "interact" | "attack";
    weapon?: WeaponPF2e | MeleePF2e | null;
}

interface IsFlatFootedParams {
    /** The circumstance potentially imposing the flat-footed condition */
    dueTo: "flanking" | "surprise" | "hidden" | "undetected";
}

interface CreatureUpdateContext<T extends CreaturePF2e> extends ActorUpdateContext<T> {
    allowHPOverage?: boolean;
}

type WithRank = { icon?: string; hover?: string; rank: ZeroToFour };

interface CreatureSheetData<TActor extends CreaturePF2e = CreaturePF2e> extends ActorSheetDataPF2e<TActor> {
    data: CreatureSystemData & {
        abilities: Record<AbilityString, AbilityData & { label?: string }>;
        attributes: {
            perception: CreatureSystemData["attributes"]["perception"] & WithRank;
        };
        saves: Record<SaveType, SaveData & WithRank>;
        skills: Record<string, SkillData & WithRank>;
    };
    languages: SheetOptions;
    abilities: ConfigPF2e["PF2E"]["abilities"];
    skills: ConfigPF2e["PF2E"]["skills"];
    actorSizes: ConfigPF2e["PF2E"]["actorSizes"];
    alignments: { [K in Alignment]?: string };
    rarity: ConfigPF2e["PF2E"]["rarityTraits"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    attitude: ConfigPF2e["PF2E"]["attitude"];
    pfsFactions: ConfigPF2e["PF2E"]["pfsFactions"];
    conditions: FlattenedCondition[];
    dying: {
        maxed: boolean;
        remainingDying: number;
        remainingWounded: number;
    };
}

type SpellcastingSheetData = RawObject<SpellcastingEntryData> & SpellcastingAbilityData;

export {
    Alignment,
    AlignmentTrait,
    CreatureSheetData,
    CreatureUpdateContext,
    GetReachParameters,
    IsFlatFootedParams,
    ModeOfBeing,
    SpellcastingSheetData,
};
