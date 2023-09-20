import { RuleElementForm } from "./base.ts";
import { FastHealingForm } from "./fast-healing.ts";
import { FlatModifierForm } from "./flat-modifier.ts";
import { GrantItemForm } from "./grant-item.ts";
import { MultipleAttackPenaltyForm } from "./multiple-attack-penalty.ts";
import { RollNoteForm } from "./roll-note.ts";
import { TokenLightForm } from "./token-light.ts";

const RULE_ELEMENT_FORMS: Partial<Record<string, ConstructorOf<RuleElementForm>>> = {
    FastHealing: FastHealingForm,
    FlatModifier: FlatModifierForm,
    GrantItem: GrantItemForm,
    MultipleAttackPenalty: MultipleAttackPenaltyForm,
    Note: RollNoteForm,
    TokenLight: TokenLightForm,
};

export { RuleElementForm, RULE_ELEMENT_FORMS };
