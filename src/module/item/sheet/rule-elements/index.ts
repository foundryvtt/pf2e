import { RuleElementForm } from "./base.ts";
import { FastHealingForm } from "./fast-healing-form.ts";
import { FlatModifierForm } from "./flat-modifier-form.ts";
import { GrantItemForm } from "./grant-item-form.ts";
import { RollNoteForm } from "./roll-note-form.ts";
import { TokenLightForm } from "./token-light-form.ts";

const RULE_ELEMENT_FORMS: Partial<Record<string, ConstructorOf<RuleElementForm>>> = {
    Note: RollNoteForm,
    GrantItem: GrantItemForm,
    FastHealing: FastHealingForm,
    FlatModifier: FlatModifierForm,
    TokenLight: TokenLightForm,
};

export { RuleElementForm, RULE_ELEMENT_FORMS };
