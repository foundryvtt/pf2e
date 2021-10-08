import {
    CreatureAttributes,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureSystemData,
    SkillAbbreviation,
    SkillData,
} from "@actor/creature/data";
import { AbilityString, RawSkillData, Rollable } from "@actor/data/base";
import { StatisticModifier } from "@module/modifiers";
import type { FamiliarPF2e } from ".";

export type FamiliarSource = BaseCreatureSource<"familiar", FamiliarSystemData>;

export class FamiliarData extends BaseCreatureData<FamiliarPF2e, FamiliarSystemData> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/familiar.svg";
}

export interface FamiliarData extends Omit<FamiliarSource, "effects" | "flags" | "items" | "token"> {
    readonly type: FamiliarSource["type"];
    data: FamiliarSource["data"];
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
    actions?: undefined;
    attack: StatisticModifier & Rollable;
    attributes: FamiliarAttributes;
    skills: Record<SkillAbbreviation, SkillData>;
    master: {
        id: string | null;
        ability: AbilityString | null;
    };
}
