import type {
    ArrayField,
    BooleanField,
    NumberField,
    ObjectField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField, RuleElementSchema } from "../data.ts";
import { RecordField } from "@system/schema-data-fields.ts";
import { ImmunityRuleElement, ResistanceRuleElement, WeaknessRuleElement } from "../iwr/index.ts";
import { BattleFormSkills, BattleFormSpeeds, BattleFormStrike } from "./types.ts";
import { CreatureTrait } from "@actor/creature/index.ts";
import { SenseAcuity, SenseType } from "@actor/creature/sense.ts";

type OverrideACSchema = {
    modifier: ResolvableValueField<false, false, true>;
    ignoreCheckPenalty: BooleanField<boolean, boolean, false, false, true>;
    ignoreSpeedPenalty: BooleanField<boolean, boolean, false, false, true>;
};

type OverrideSenseSchema = {
    acuity: StringField<SenseAcuity, SenseAcuity, false, false, false>;
    range: NumberField<number, number, false, true, false>;
};

type BattleFormRuleOverrideSchema = {
    traits: ArrayField<StringField<CreatureTrait, CreatureTrait, true, false, false>>;
    armorClass: SchemaField<
        OverrideACSchema,
        SourceFromSchema<OverrideACSchema>,
        ModelPropsFromSchema<OverrideACSchema>,
        false,
        false,
        false
    >;
    tempHP: ResolvableValueField<false, true, true>;
    senses: RecordField<
        StringField<SenseType, SenseType, true, false, false>,
        SchemaField<OverrideSenseSchema>,
        false,
        false,
        false
    >;
    size: StringField<string, string, false, true, false>;
    speeds: ObjectField<BattleFormSpeeds, BattleFormSpeeds, false, false, false>;
    skills: ObjectField<BattleFormSkills, BattleFormSkills, false, false, false>;
    strikes: ObjectField<Record<string, BattleFormStrike>, Record<string, BattleFormStrike>, false, false, false>;
    immunities: ArrayField<ObjectField<Omit<ImmunityRuleElement["_source"], "key">>>;
    weaknesses: ArrayField<ObjectField<Omit<WeaknessRuleElement["_source"], "key">>>;
    resistances: ArrayField<ObjectField<Omit<ResistanceRuleElement["_source"], "key">>>;
};

type BattleFormRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<false, false, false>;
    overrides: SchemaField<BattleFormRuleOverrideSchema>;
    canCast: BooleanField<boolean, boolean, false, false, true>;
    canSpeak: BooleanField<boolean, boolean, false, false, true>;
    hasHands: BooleanField<boolean, boolean, false, false, true>;
    /** Whether the actor uses its own unarmed attacks while in battle form */
    ownUnarmed: BooleanField<boolean, boolean, false, false, true>;
};

export { BattleFormRuleSchema, BattleFormRuleOverrideSchema };
