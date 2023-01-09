import { CreatureTrait, MovementType, SkillAbbreviation } from "@actor/creature/data";
import { SenseAcuity, SenseType } from "@actor/creature/sense";
import { ImmunityType, ResistanceType, WeaknessType } from "@actor/types";
import { AbilityString } from "@actor/types";
import { WeaponDamage } from "@item/weapon/data";
import { BaseWeaponType, WeaponCategory, WeaponGroup, WeaponTrait } from "@item/weapon/types";
import { Size } from "@module/data";
import { BracketedValue, RuleElementSource } from "../";

interface BattleFormSource extends RuleElementSource {
    overrides?: BattleFormOverrides;
    canCast?: boolean;
    canSpeak?: boolean;
    /** Does the character have hands, allowing it to use manipulate actions? */
    hasHands?: boolean;
    /** Can the character utilize its own unarmed strikes? */
    ownUnarmed?: boolean;
}

interface BattleFormOverrides {
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

interface BattleFormAC {
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

type BattleFormSkills = { [K in SkillAbbreviation]?: BattleFormSkill };

interface BattleFormStrike {
    label: string;
    img?: ImageFilePath;
    ability: AbilityString;
    category: WeaponCategory;
    group: WeaponGroup | null;
    baseType?: BaseWeaponType | null;
    traits: WeaponTrait[];
    modifier: string | number;
    damage: WeaponDamage;
    ownIfHigher?: boolean;
}

interface BattleFormStrikeQuery {
    pack: string;
    query: string;
    modifier: number;
    ownIfHigher: boolean;
}

export {
    BattleFormAC,
    BattleFormOverrides,
    BattleFormSkills,
    BattleFormSource,
    BattleFormStrike,
    BattleFormStrikeQuery,
};
