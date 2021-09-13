import { SenseType } from "@actor/character/data";
import { CreatureTrait, MovementType, SenseAcuity, SkillAbbreviation } from "@actor/creature/data";
import { AbilityString } from "@actor/data";
import { BaseWeaponType, WeaponCategory, WeaponDamage, WeaponGroup, WeaponTrait } from "@item/weapon/data";
import { Size } from "@module/data";
import { RuleElementSource } from "@module/rules/rules-data-definitions";

export interface BattleFormSource extends RuleElementSource {
    ignored?: boolean;
    overrides?: BattleFormOverrides;
}

export interface BattleFormOverrides {
    traits?: CreatureTrait[];
    armorClass?: BattleFormAC;
    tempHP?: number | null;
    senses?: { [K in SenseType]?: BattleFormSense };
    size?: Size | null;
    speeds?: { [K in MovementType]?: number };
    skills?: { [K in SkillAbbreviation]?: BattleFormSkill };
    strikes?: Record<string, BattleFormStrike>;
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
    ownModifierBonus?: number | null;
    ignoreCheckPenalty?: boolean;
    ignoreSpeedReduction?: boolean;
}

interface BattleFormSense {
    acuity?: SenseAcuity;
    range?: number | null;
}

interface BattleFormSkill {
    modifier: string | number;
}

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
