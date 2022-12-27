import { RuleElementForm } from "./base";
import { FastHealingForm } from "./fast-healing-form";
import { FlatModifierForm } from "./flat-modifier-form";
import { GrantItemForm } from "./grant-item-form";
import { RollNoteForm } from "./roll-note-form";

const RULE_ELEMENT_FORMS: Partial<Record<string, ConstructorOf<RuleElementForm>>> = {
    Note: RollNoteForm,
    GrantItem: GrantItemForm,
    FastHealing: FastHealingForm,
    FlatModifier: FlatModifierForm,
};

export { RuleElementForm, RULE_ELEMENT_FORMS };
