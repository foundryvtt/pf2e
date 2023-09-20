import { RuleElementForm } from "./base.ts";
import { FastHealingForm } from "./fast-healing.ts";
import { FlatModifierForm } from "./flat-modifier.ts";
import { GrantItemForm } from "./grant-item.ts";
import { RollNoteForm } from "./roll-note.ts";
import { TokenLightForm } from "./token-light.ts";

const RULE_ELEMENT_FORMS: Partial<Record<string, ConstructorOf<RuleElementForm>>> = {
    Note: RollNoteForm,
    GrantItem: GrantItemForm,
    FastHealing: FastHealingForm,
    FlatModifier: FlatModifierForm,
    TokenLight: TokenLightForm,
};

export { RuleElementForm, RULE_ELEMENT_FORMS };
