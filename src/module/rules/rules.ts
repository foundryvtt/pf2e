import { RuleElementData } from './rules-data-definitions';
import { RuleElementPF2e } from './rule-element';
import { PF2FlatModifierRuleElement } from './elements/flatmodifier';
import { PF2MageArmorRuleElement } from './spells/mage-armor';
import { PF2FixedProficiencyRuleElement } from './elements/fixed-proficiency';
import { PF2TempHPRuleElement } from './elements/temphp';
import { PF2DexterityModifierCapRuleElement } from './elements/dexterity-modifier-cap';
import { PF2DamageDiceRuleElement } from './elements/damage-dice';
import { PF2TogglePropertyRuleElement } from './elements/toggle-property';
import { PF2TokenImageRuleElement } from './elements/token-image';
import { PF2TokenSizeRuleElement } from './elements/token-size';
import { PF2BaseSpeedRuleElement } from './elements/base-speed';
import { PF2SenseRuleElement } from './elements/sense';
import { PF2TokenEffectIconRuleElement } from './elements/token-effect-icon';
import { PF2StrikeRuleElement } from './elements/strike';
import { PF2SetPropertyRuleElement } from './elements/set-property';
import { PF2RollNoteRuleElement } from './elements/roll-note';
import { PF2WeaponPotencyRuleElement } from './elements/weapon-potency';
import { PF2StrikingRuleElement } from './elements/striking';
import { PF2MultipleAttackPenaltyRuleElement } from './elements/multiple-attack-penalty';
import { PF2EffectTargetRuleElement } from './elements/effect-target';
import { PF2ActorTraits } from '@module/rules/elements/actor-traits';
import { PF2RecoveryCheckDCRuleElement } from '@module/rules/feats/recovery-check-dc';
import { PF2AdjustDegreeOfSuccessRuleElement } from './elements/adjust-degree-of-success';
import type { ItemPF2e } from '@item';
export { RuleElementPF2e };

/**
 * @category RuleElement
 */
export class RuleElements {
    static readonly builtin: Record<string, (ruleData: RuleElementData, item: Embedded<ItemPF2e>) => RuleElementPF2e> =
        Object.freeze({
            'PF2E.RuleElement.FlatModifier': (ruleData, item) => new PF2FlatModifierRuleElement(ruleData, item),
            'PF2E.RuleElement.MageArmor': (ruleData, item) => new PF2MageArmorRuleElement(ruleData, item),
            'PF2E.RuleElement.DexterityModifierCap': (ruleData, item) =>
                new PF2DexterityModifierCapRuleElement(ruleData, item),
            'PF2E.RuleElement.FixedProficiency': (ruleData, item) => new PF2FixedProficiencyRuleElement(ruleData, item),
            'PF2E.RuleElement.TempHP': (ruleData, item) => new PF2TempHPRuleElement(ruleData, item),
            'PF2E.RuleElement.DamageDice': (ruleData, item) => new PF2DamageDiceRuleElement(ruleData, item),
            'PF2E.RuleElement.ToggleProperty': (ruleData, item) => new PF2TogglePropertyRuleElement(ruleData, item),
            'PF2E.RuleElement.TokenEffectIcon': (ruleData, item) => new PF2TokenEffectIconRuleElement(ruleData, item),
            'PF2E.RuleElement.TokenImage': (ruleData, item) => new PF2TokenImageRuleElement(ruleData, item),
            'PF2E.RuleElement.TokenSize': (ruleData, item) => new PF2TokenSizeRuleElement(ruleData, item),
            'PF2E.RuleElement.BaseSpeed': (ruleData, item) => new PF2BaseSpeedRuleElement(ruleData, item),
            'PF2E.RuleElement.Sense': (ruleData, item) => new PF2SenseRuleElement(ruleData, item),
            'PF2E.RuleElement.SetProperty': (ruleData, item) => new PF2SetPropertyRuleElement(ruleData, item),
            'PF2E.RuleElement.Strike': (ruleData, item) => new PF2StrikeRuleElement(ruleData, item),
            'PF2E.RuleElement.Striking': (ruleData, item) => new PF2StrikingRuleElement(ruleData, item),
            'PF2E.RuleElement.Note': (ruleData, item) => new PF2RollNoteRuleElement(ruleData, item),
            'PF2E.RuleElement.MultipleAttackPenalty': (ruleData, item) =>
                new PF2MultipleAttackPenaltyRuleElement(ruleData, item),
            'PF2E.RuleElement.EffectTarget': (ruleData, item) => new PF2EffectTargetRuleElement(ruleData, item),
            'PF2E.RuleElement.WeaponPotency': (ruleData, item) => new PF2WeaponPotencyRuleElement(ruleData, item),
            'PF2E.RuleElement.ActorTraits': (ruleData, item) => new PF2ActorTraits(ruleData, item),
            'PF2E.RuleElement.RecoveryCheckDC': (ruleData, item) => new PF2RecoveryCheckDCRuleElement(ruleData, item),
            'PF2E.RuleElement.AdjustDegreeOfSuccess': (ruleData, item) =>
                new PF2AdjustDegreeOfSuccessRuleElement(ruleData, item),
        });

    static custom: Record<string, (ruleData: RuleElementData, item: Embedded<ItemPF2e>) => RuleElementPF2e> = {};

    static fromOwnedItem(item: Embedded<ItemPF2e>): RuleElementPF2e[] {
        const rules: RuleElementPF2e[] = [];
        for (const data of item.data.data.rules) {
            const rule = this.custom[data.key] ?? this.builtin[data.key];
            if (rule) {
                rules.push(rule(data, item));
            } else {
                console.warn(`PF2E | Unknown rule element ${data.key}`);
            }
        }
        return rules;
    }
}
