import { CreatureTrait, MovementType, SkillAbbreviation } from "@actor/creature/data";
import { SenseAcuity, SenseType } from "@actor/creature/sense";
import { AbilityString } from "@actor/data";
import { ImmunityType, ResistanceType, WeaknessType } from "@actor/data/base";
import { WeaponDamage } from "@item/weapon/data";
import { BaseWeaponType, WeaponCategory, WeaponGroup, WeaponTrait } from "@item/weapon/types";
import { Size } from "@module/data";
import { BracketedValue, RuleElementSource } from "../";

export interface BattleFormSource extends RuleElementSource {
    overrides?: BattleFormOverrides;
    canCast?: boolean;
    canSpeak?: boolean;
    /** Does the character have hands, allowing it to use manipulate actions? */
    hasHands?: boolean;
    /** Can the character utilize its own unarmed strikes? */
    ownUnarmed?: boolean;
}

export interface BattleFormOverrides {
    traits?: CreatureTrait[];
    armorClass?: BattleFormAC;
    tempHP?: number | null;
    senses?: { [K in SenseType]?: BattleFormSense };
    size?: Size | null;
    speeds?: { [K in MovementType]?: number };
    skills?: BattleFormSkills;
    strikes?: Record<string, BattleFormStrike>;
    immunities?: { type: ImmunityType; except?: ImmunityType }[];
    weaknesses?: { type: WeaknessType; except?: WeaknessType; value: number | BracketedValue<number> }[];
    resistances?: { type: ResistanceType; except?: ResistanceType; value: number | BracketedValue<number> }[];
}

export interface BattleFormAC {
    modifier?: string | number;
    ignoreCheckPenalty?: boolean;
    ignoreSpeedPenalty?: boolean;
}

interface BattleFormSense {
    acuity?: SenseAcuity;
    range?: number | null;
}

interface BattleFormSkill {
    modifier: string | number;
    ownIfHigher?: boolean;
}
export type BattleFormSkills = { [K in SkillAbbreviation]?: BattleFormSkill };

export interface BattleFormStrike {
    label: string;
    img?: ImagePath;
    ability: AbilityString;
    category: WeaponCategory;
    group: WeaponGroup;
    baseType?: BaseWeaponType;
    traits: WeaponTrait[];
    modifier: string | number;
    damage: WeaponDamage;
    ownIfHigher?: boolean;
}
