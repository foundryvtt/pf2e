import { SenseType } from "@actor/character/data";
import { CreatureTrait, MovementType, SenseAcuity, SkillAbbreviation } from "@actor/creature/data";
import { AbilityString } from "@actor/data";
import { ImmunityType, ResistanceType, WeaknessType } from "@actor/data/base";
import { BaseWeaponType, WeaponCategory, WeaponDamage, WeaponGroup, WeaponTrait } from "@item/weapon/data";
import { Size } from "@module/data";
import { BracketedValue, RuleElementSource } from "@module/rules/rules-data-definitions";

export interface BattleFormSource extends RuleElementSource {
    overrides?: BattleFormOverrides;
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
    ownModifier?: {
        armorClass?: boolean;
        skills?: boolean;
        strikes?: boolean;
    };
    dismissable?: boolean;
    canCast?: boolean;
    canSpeak?: boolean;
    hasHands?: boolean;
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
}
export type BattleFormSkills = { [K in SkillAbbreviation]?: BattleFormSkill };

interface BattleFormStrike {
    label: string;
    img?: ImagePath;
    ability: AbilityString;
    category: WeaponCategory;
    group: WeaponGroup;
    baseType?: BaseWeaponType;
    traits: WeaponTrait[];
    modifier: string | number;
    damage: WeaponDamage;
}
