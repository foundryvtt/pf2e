import { ActorTraitsForm } from "./actor-traits.ts";
import { AuraForm } from "./aura.ts";
import { RuleElementForm } from "./base.ts";
import { DamageAlterationForm } from "./damage-alteration.ts";
import { FastHealingForm } from "./fast-healing.ts";
import { FlatModifierForm } from "./flat-modifier.ts";
import { GrantItemForm } from "./grant-item.ts";
import { RollNoteForm } from "./roll-note.ts";
import { TokenImageForm } from "./token-image.ts";
import { TokenLightForm } from "./token-light.ts";

const RULE_ELEMENT_FORMS: Partial<Record<string, ConstructorOf<RuleElementForm>>> = {
    ActorTraits: ActorTraitsForm,
    Aura: AuraForm,
    DamageAlteration: DamageAlterationForm,
    FastHealing: FastHealingForm,
    FlatModifier: FlatModifierForm,
    GrantItem: GrantItemForm,
    Note: RollNoteForm,
    TokenImage: TokenImageForm,
    TokenLight: TokenLightForm,
};

export { RULE_ELEMENT_FORMS, RuleElementForm };
