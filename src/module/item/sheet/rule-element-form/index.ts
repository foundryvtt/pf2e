import { AuraForm } from "./aura.ts";
import { RuleElementForm } from "./base.ts";
import { FastHealingForm } from "./fast-healing.ts";
import { FlatModifierForm } from "./flat-modifier.ts";
import { GrantItemForm } from "./grant-item.ts";
import { MultipleAttackPenaltyForm } from "./multiple-attack-penalty.ts";
import { RollNoteForm } from "./roll-note.ts";
import { TokenImageForm } from "./token-image.ts";
import { TokenLightForm } from "./token-light.ts";

const RULE_ELEMENT_FORMS: Partial<Record<string, ConstructorOf<RuleElementForm>>> = {
    Aura: AuraForm,
    FastHealing: FastHealingForm,
    FlatModifier: FlatModifierForm,
    GrantItem: GrantItemForm,
    MultipleAttackPenalty: MultipleAttackPenaltyForm,
    Note: RollNoteForm,
    TokenImage: TokenImageForm,
    TokenLight: TokenLightForm,
};

export { RULE_ELEMENT_FORMS, RuleElementForm };
