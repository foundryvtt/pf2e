import { ActorPF2e, ActorUpdateContext } from "@actor/base.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { AbilityString, SaveType } from "@actor/types.ts";
import { MeleePF2e, WeaponPF2e } from "@item";
import { ZeroToFour } from "@module/data.ts";
import { SheetOptions } from "@module/sheet/helpers.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { AbilityData, CreatureSystemData, SaveData, SkillData } from "./data.ts";
import { CreaturePF2e } from "./document.ts";
import { ALIGNMENTS, ALIGNMENT_TRAITS } from "./values.ts";

type Alignment = SetElement<typeof ALIGNMENTS>;
type AlignmentTrait = SetElement<typeof ALIGNMENT_TRAITS>;
type CreatureTrait = keyof ConfigPF2e["PF2E"]["creatureTraits"] | AlignmentTrait;

type ModeOfBeing = "living" | "undead" | "construct" | "object";

interface GetReachParameters {
    action?: "interact" | "attack";
    weapon?: WeaponPF2e<ActorPF2e> | MeleePF2e<ActorPF2e> | null;
}

interface CreatureUpdateContext<TParent extends TokenDocumentPF2e | null> extends ActorUpdateContext<TParent> {
    allowHPOverage?: boolean;
}

type WithRank = { icon?: string; hover?: string; rank: ZeroToFour };

interface CreatureSheetData<TActor extends CreaturePF2e> extends ActorSheetDataPF2e<TActor> {
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
    dying: {
        maxed: boolean;
        remainingDying: number;
        remainingWounded: number;
    };
}

export {
    Alignment,
    AlignmentTrait,
    CreatureSheetData,
    CreatureTrait,
    CreatureUpdateContext,
    GetReachParameters,
    ModeOfBeing,
};
