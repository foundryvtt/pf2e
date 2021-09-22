import {
    CreatureAttributes,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureSystemData,
    SkillAbbreviation,
    SkillData,
} from "@actor/creature/data";
import { AbilityString, ActorFlagsPF2e, RawSkillData, Rollable } from "@actor/data/base";
import { StatisticModifier } from "@module/modifiers";
import type { FamiliarPF2e } from ".";

export type FamiliarSource = BaseCreatureSource<"familiar", FamiliarSystemData>;

export class FamiliarData extends BaseCreatureData<FamiliarPF2e, FamiliarSystemData> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/familiar.svg";
}

export interface FamiliarData extends Omit<FamiliarSource, "effects" | "items" | "token"> {
    readonly type: FamiliarSource["type"];
    data: FamiliarSource["data"];
    flags: ActorFlagsPF2e;
    readonly _source: FamiliarSource;
}

interface FamiliarAttributes extends CreatureAttributes {
    ac: { value: number; breakdown: string; check?: number };
    perception: { value: number } & Partial<RawSkillData> & Rollable;
}

/** The raw information contained within the actor data object for familiar actors. */
export interface FamiliarSystemData extends CreatureSystemData {
    details: CreatureSystemData["details"] & {
        creature: {
            value: string;
        };
    };
    attack: StatisticModifier & Rollable;
    attributes: FamiliarAttributes;
    skills: Record<SkillAbbreviation, SkillData>;
    master: {
        id: string | null;
        ability: AbilityString | null;
    };
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}
