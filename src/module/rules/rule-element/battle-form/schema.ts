import type { CreatureTrait } from "@actor/creature/index.ts";
import type { SenseAcuity, SenseType } from "@actor/creature/types.ts";
import type { RecordField } from "@system/schema-data-fields.ts";
import type * as fields from "types/foundry/common/data/fields.d.ts";
import type { ResolvableValueField, RuleElementSchema } from "../data.ts";
import type { ImmunityRuleElement, ResistanceRuleElement, WeaknessRuleElement } from "../iwr/index.ts";
import type { BattleFormSkills, BattleFormSpeeds, BattleFormStrike } from "./types.ts";

type OverrideACSchema = {
    modifier: ResolvableValueField<false, false, true>;
    ignoreCheckPenalty: fields.BooleanField<boolean, boolean, false, false, true>;
    ignoreSpeedPenalty: fields.BooleanField<boolean, boolean, false, false, true>;
    ownIfHigher: fields.BooleanField<boolean, boolean, false, false, true>;
};

type OverrideSenseSchema = {
    acuity: fields.StringField<SenseAcuity, SenseAcuity, false, false, false>;
    range: fields.NumberField<number, number, false, true, false>;
};

type BattleFormRuleOverrideSchema = {
    traits: fields.ArrayField<fields.StringField<CreatureTrait, CreatureTrait, true, false, false>>;
    armorClass: fields.SchemaField<
        OverrideACSchema,
        SourceFromSchema<OverrideACSchema>,
        ModelPropsFromSchema<OverrideACSchema>,
        false,
        false,
        true
    >;
    tempHP: ResolvableValueField<false, true, true>;
    senses: RecordField<
        fields.StringField<SenseType, SenseType, true, false, false>,
        fields.SchemaField<OverrideSenseSchema>,
        false,
        false,
        true
    >;
    size: fields.StringField<string, string, false, true, false>;
    speeds: fields.ObjectField<BattleFormSpeeds, BattleFormSpeeds, false, false, true>;
    skills: fields.ObjectField<BattleFormSkills, BattleFormSkills, false, false, true>;
    strikes: fields.ObjectField<Record<string, BattleFormStrike>, Record<string, BattleFormStrike>, false, false, true>;
    immunities: fields.ArrayField<fields.ObjectField<Omit<ImmunityRuleElement["_source"], "key">>>;
    weaknesses: fields.ArrayField<fields.ObjectField<Omit<WeaknessRuleElement["_source"], "key">>>;
    resistances: fields.ArrayField<fields.ObjectField<Omit<ResistanceRuleElement["_source"], "key">>>;
};

type BattleFormRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<false, false, false>;
    overrides: fields.SchemaField<BattleFormRuleOverrideSchema>;
    canCast: fields.BooleanField<boolean, boolean, false, false, true>;
    canSpeak: fields.BooleanField<boolean, boolean, false, false, true>;
    hasHands: fields.BooleanField<boolean, boolean, false, false, true>;
    /** Whether the actor uses its own unarmed attacks while in battle form */
    ownUnarmed: fields.BooleanField<boolean, boolean, false, false, true>;
};

export type { BattleFormRuleOverrideSchema, BattleFormRuleSchema };
