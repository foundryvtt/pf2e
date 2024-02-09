import type { CreatureTrait, SenseAcuity, SenseType, SkillAbbreviation } from "@actor/creature/index.ts";
import type { AttributeString, MovementType } from "@actor/types.ts";
import type { WeaponDamage } from "@item/weapon/data.ts";
import type { BaseWeaponType, WeaponCategory, WeaponGroup, WeaponTrait } from "@item/weapon/types.ts";
import type { Size } from "@module/data.ts";
import type { RawPredicate } from "@system/predication.ts";
import type { RuleElementSource } from "../index.ts";
import type { ImmunityRuleElement, ResistanceRuleElement, WeaknessRuleElement } from "../iwr/index.ts";

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
    senses?: BattleFormSenses;
    size?: Size | null;
    speeds?: BattleFormSpeeds;
    skills?: BattleFormSkills;
    strikes?: Record<string, BattleFormStrike>;
    immunities?: Omit<ImmunityRuleElement["_source"], "key">[];
    weaknesses?: Omit<WeaknessRuleElement["_source"], "key">[];
    resistances?: Omit<ResistanceRuleElement["_source"], "key">[];
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

type BattleFormSenses = { [K in SenseType]?: BattleFormSense };
type BattleFormSkills = { [K in SkillAbbreviation]?: BattleFormSkill };
type BattleFormSpeeds = { [K in MovementType]?: number };

interface BattleFormStrike {
    label: string;
    img?: ImageFilePath;
    predicate?: RawPredicate;
    ability?: AttributeString;
    category: WeaponCategory;
    group: WeaponGroup | null;
    baseType?: BaseWeaponType | null;
    traits: WeaponTrait[];
    modifier: string | number;
    damage: WeaponDamage;
    ownIfHigher?: boolean;
    range?: number | null;
    maxRange?: number | null;
}

interface BattleFormStrikeQuery {
    pack: string;
    query: string;
    modifier: number;
    ownIfHigher: boolean;
}

export type {
    BattleFormAC,
    BattleFormOverrides,
    BattleFormSenses,
    BattleFormSkills,
    BattleFormSource,
    BattleFormSpeeds,
    BattleFormStrike,
    BattleFormStrikeQuery,
};
